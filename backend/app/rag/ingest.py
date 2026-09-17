"""Secure document ingestion with quarantine, native FAISS index export, and SHA-256 manifests."""
import hashlib
import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Dict, Any
import faiss
import numpy as np
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from backend.app.config import settings
from backend.app.rag.embeddings import get_embeddings

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
                    d.metadata["doc_type"] = "manual" if "manual" in str(file_path).lower() else "sop"

                documents.extend(docs)
            except Exception as e:
                logger.warning(f"Failed to load {file_path}: {e}")

    return documents, quarantined

def ingest_and_index() -> int:
    """Load documents, chunk, embed, and store native FAISS index with SHA-256 manifest."""
    logger.info(f"Loading technical documents from: {settings.DOCS_DIR}")
    raw_docs, quarantined = load_documents(settings.DOCS_DIR)

    if quarantined:
        logger.warning(f"Excluded {len(quarantined)} quarantined document(s) from knowledge base.")

    if not raw_docs:
        logger.warning("No documents found in docs_dir!")
        return 0

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=120,
        separators=["\n### ", "\n#### ", "\n## ", "\n\n", "\n", " "]
    )
    chunks = text_splitter.split_documents(raw_docs)
    logger.info(f"Created {len(chunks)} chunks from {len(raw_docs)} documents.")

    logger.info(f"Computing embeddings with {settings.EMBEDDING_MODEL_NAME}...")
    embeddings = get_embeddings()
    texts = [c.page_content for c in chunks]
    vectors = np.array(embeddings.embed_documents(texts), dtype=np.float32)

    # Normalize L2 for inner product / cosine similarity
    faiss.normalize_L2(vectors)
    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    # Save Native FAISS index (no pickle!)
    settings.VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)
    index_file = settings.VECTOR_STORE_DIR / INDEX_FILE
    faiss.write_index(index, str(index_file))

    # Save chunks cache in clean JSON
    cache_path = settings.VECTOR_STORE_DIR / CHUNKS_METADATA_FILE
    serialized_chunks = [
        {"id": i, "page_content": c.page_content, "metadata": c.metadata}
        for i, c in enumerate(chunks)
    ]
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(serialized_chunks, f, indent=2)

    # Delete obsolete index.pkl if it exists
    legacy_pkl = settings.VECTOR_STORE_DIR / "faiss_index" / "index.pkl"
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
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "indexed_at": datetime.utcnow().isoformat(),
        "quarantined_files": quarantined
    }
    manifest_path = settings.VECTOR_STORE_DIR / MANIFEST_FILE
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Native FAISS index and SHA-256 manifest saved successfully. Total chunks: {len(chunks)}")
    return len(chunks)

if __name__ == "__main__":
    count = ingest_and_index()
    print(f"Ingestion complete: {count} chunks indexed natively.")
