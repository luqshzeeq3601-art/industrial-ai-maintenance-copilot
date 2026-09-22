"""Secure document ingestion with quarantine, native FAISS index export, and SHA-256 manifests."""
import hashlib
import json
import logging
import re
import time
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import faiss
import numpy as np
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_core.documents import Document
from backend.app.config import settings
from backend.app.rag.embeddings import get_embeddings, get_model_revision
from backend.app.rag.model_configs import get_model_config, apply_document_prompt
from backend.app.rag.chunking import chunk_documents, METADATA_SCHEMA_VERSION, CHUNKING_RECIPES
from backend.app.rag.metadata import doc_type_for_path

logger = logging.getLogger("copilot.rag.ingest")

CHUNKS_METADATA_FILE = "chunks_cache.json"
MANIFEST_FILE = "manifest.json"
INDEX_FILE = "index.faiss"

# Malicious instruction patterns inside document text
QUARANTINE_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s+prompt\s+override",
    r"disregard\s+safety\s+protocols",
    r"bypass\s+loto",
    r"admin\s+override\s+command"
]

def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash of a file."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def scan_for_malicious_content(doc_path: Path, content: str) -> Tuple[bool, str]:
    """Inspect document content for embedded injection instructions or tampering."""
    for pat in QUARANTINE_PATTERNS:
        if re.search(pat, content, re.IGNORECASE):
            return True, f"Matched forbidden instruction pattern: '{pat}'"
    return False, ""

def load_documents(docs_dir: Path) -> Tuple[List[Document], List[Dict[str, str]]]:
    """Scan and load all markdown, text, and PDF files in docs_dir with quarantine check."""
    documents: List[Document] = []
    quarantined: List[Dict[str, str]] = []

    if not docs_dir.exists():
        docs_dir.mkdir(parents=True, exist_ok=True)
        return documents, quarantined

    for file_path in sorted(docs_dir.rglob("*")):
        if file_path.is_file() and file_path.suffix.lower() in [".md", ".txt", ".pdf"]:
            try:
                if file_path.suffix.lower() in [".md", ".txt"]:
                    loader = TextLoader(str(file_path), encoding="utf-8")
                    docs = loader.load()
                elif file_path.suffix.lower() == ".pdf":
                    loader = PyPDFLoader(str(file_path))
                    docs = loader.load()
                else:
                    continue

                for d in docs:
                    # Security: Content quarantine scan
                    is_malicious, reason = scan_for_malicious_content(file_path, d.page_content)
                    if is_malicious:
                        logger.error(f"QUARANTINED document {file_path.name}: {reason}")
                        quarantined.append({"file": file_path.name, "reason": reason})
                        docs = []
                        break

                    d.metadata["source"] = file_path.name
                    d.metadata["doc_type"] = doc_type_for_path(file_path)
                    # Preserve PDF page numbers (PyPDFLoader sets "page"); default 0 for text.
                    if "page" not in d.metadata:
                        d.metadata["page"] = 0

                documents.extend(docs)
            except Exception as e:
                logger.warning(f"Failed to load {file_path}: {e}")

    return documents, quarantined

def ingest_and_index(
    vector_store_dir: Optional[Path] = None,
    docs_dir: Optional[Path] = None,
    chunking_recipe: Optional[str] = None,
    embedding_model: Optional[str] = None,
) -> int:
    """Load documents, chunk, embed, and store native FAISS index with SHA-256 manifest.

    All parameters default to production settings. Experimental configurations
    MUST pass an isolated vector_store_dir under scratch/ so the production
    index is never overwritten until the promotion gate passes.
    Returns chunk count. Timing breakdown is recorded in the manifest.
    """
    target_dir = Path(vector_store_dir) if vector_store_dir else settings.VECTOR_STORE_DIR
    source_dir = Path(docs_dir) if docs_dir else settings.DOCS_DIR
    recipe = chunking_recipe or settings.CHUNKING_RECIPE
    model_name = embedding_model or settings.EMBEDDING_MODEL_NAME
    if recipe not in CHUNKING_RECIPES:
        raise ValueError(f"Unknown chunking recipe '{recipe}'")
    t_ingest_start = time.perf_counter()
    logger.info(f"Loading technical documents from: {source_dir}")
    raw_docs, quarantined = load_documents(source_dir)

    if quarantined:
        logger.warning(f"Excluded {len(quarantined)} quarantined document(s) from knowledge base.")

    if not raw_docs:
        logger.warning("No documents found in docs_dir!")
        return 0

    chunks = chunk_documents(raw_docs, recipe=recipe)
    logger.info(f"Created {len(chunks)} chunks from {len(raw_docs)} documents (recipe={recipe}).")

    logger.info(f"Computing embeddings with {model_name}...")
    t_embed_start = time.perf_counter()
    embeddings = get_embeddings(model_name)
    # Embed the header-carrying embedding_text when present; fall back to page_content.
    texts = [c.metadata.get("embedding_text", c.page_content) for c in chunks]
    prompted = [apply_document_prompt(t, model_name) for t in texts]
    t_load_end = time.perf_counter()
    vectors = np.array(embeddings.embed_documents(prompted), dtype=np.float32)
    t_embed_end = time.perf_counter()

    # Normalize L2 for inner product / cosine similarity
    faiss.normalize_L2(vectors)
    dim = vectors.shape[1]
    expected = get_model_config(model_name).expected_dim
    if expected and expected > 0 and dim != expected:
        logger.warning(f"Embedding dim {dim} != expected {expected} for {model_name}")
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)
    t_index_end = time.perf_counter()

    # Save Native FAISS index (no pickle!)
    target_dir.mkdir(parents=True, exist_ok=True)
    index_file = target_dir / INDEX_FILE
    faiss.write_index(index, str(index_file))

    # Save chunks cache in clean JSON
    cache_path = target_dir / CHUNKS_METADATA_FILE
    serialized_chunks = [
        {"id": i, "page_content": c.page_content, "metadata": c.metadata}
        for i, c in enumerate(chunks)
    ]
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(serialized_chunks, f, indent=2)

    # Delete obsolete index.pkl if it exists
    legacy_pkl = target_dir / "faiss_index" / "index.pkl"
    if legacy_pkl.exists():
        legacy_pkl.unlink()

    # Generate SHA-256 Manifest
    manifest = {
        "index_file": INDEX_FILE,
        "index_sha256": calculate_sha256(index_file),
        "chunks_file": CHUNKS_METADATA_FILE,
        "chunks_sha256": calculate_sha256(cache_path),
        "total_chunks": len(chunks),
        "dimension": dim,
        "embedding_model": model_name,
        "embedding_revision": get_model_revision(model_name),
        "chunking_recipe": recipe,
        "chunking_recipe_detail": CHUNKING_RECIPES[recipe],
        "metadata_schema_version": METADATA_SCHEMA_VERSION,
        "indexed_at": datetime.utcnow().isoformat(),
        "quarantined_files": quarantined,
        "timing_seconds": {
            "load_and_chunk": round(t_embed_start - t_ingest_start, 3),
            "model_load_plus_embed_setup": round(t_load_end - t_embed_start, 3),
            "document_embedding": round(t_embed_end - t_load_end, 3),
            "index_build": round(t_index_end - t_embed_end, 3),
            "total": round(t_index_end - t_ingest_start, 3),
        },
    }
    manifest_path = target_dir / MANIFEST_FILE
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Native FAISS index and SHA-256 manifest saved successfully. Total chunks: {len(chunks)}")
    return len(chunks)

if __name__ == "__main__":
    count = ingest_and_index()
    print(f"Ingestion complete: {count} chunks indexed natively.")
