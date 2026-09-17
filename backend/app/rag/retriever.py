"""Hybrid Retriever combining Native FAISS dense vector search and BM25 with Reciprocal Rank Fusion (RRF)."""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import faiss
import numpy as np
from rank_bm25 import BM25Okapi
from backend.app.config import settings
from backend.app.rag.embeddings import get_embeddings
from backend.app.rag.ingest import (
    CHUNKS_METADATA_FILE,
    INDEX_FILE,
    MANIFEST_FILE,
    calculate_sha256,
    ingest_and_index
)

logger = logging.getLogger("copilot.rag.retriever")
_retriever_instance = None

class HybridIndustrialRetriever:
    def __init__(
        self,
        enable_metadata_filter: bool = False,
        enable_reranker: bool = False
    ):
        self.index: Optional[faiss.Index] = None
        self.chunks: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.tokenized_corpus: List[List[str]] = []
        self.enable_metadata_filter = enable_metadata_filter
        self.enable_reranker = enable_reranker
        self._initialize()

    def _initialize(self):
        index_path = settings.VECTOR_STORE_DIR / INDEX_FILE
        cache_path = settings.VECTOR_STORE_DIR / CHUNKS_METADATA_FILE
        manifest_path = settings.VECTOR_STORE_DIR / MANIFEST_FILE

        # Verify integrity and auto-ingest if absent or invalid
        needs_ingest = not (index_path.exists() and cache_path.exists() and manifest_path.exists())
        if not needs_ingest:
            try:
                with open(manifest_path, "r", encoding="utf-8") as f:
                    manifest = json.load(f)
                if calculate_sha256(index_path) != manifest.get("index_sha256"):
                    logger.warning("FAISS index SHA-256 mismatch. Re-ingesting...")
                    needs_ingest = True
                elif calculate_sha256(cache_path) != manifest.get("chunks_sha256"):
                    logger.warning("Chunks cache SHA-256 mismatch. Re-ingesting...")
                    needs_ingest = True
            except Exception as e:
                logger.warning(f"Error checking manifest: {e}. Re-ingesting...")
                needs_ingest = True

        if needs_ingest:
            logger.info("Initializing vector store via secure ingestion...")
            ingest_and_index()

        # 1. Native FAISS index loading (no unsafe pickle!)
        self.index = faiss.read_index(str(index_path))

        # 2. Load chunk metadata
        with open(cache_path, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)

        # 3. Initialize BM25 with tokenized corpus
        self.tokenized_corpus = [
            self._tokenize(chunk["page_content"]) for chunk in self.chunks
        ]
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        logger.info(f"Hybrid retriever ready: {self.index.ntotal} vectors, {len(self.chunks)} BM25 documents.")

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return text.lower().replace("-", " ").replace("_", " ").split()

    def retrieve(
        self,
        query: str,
        k: int = 4,
        doc_type_filter: Optional[str] = None,
        machine_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve top-k documents using Reciprocal Rank Fusion (RRF)."""
        if not self.chunks or self.index is None:
            return []

        # 1. Dense FAISS Search
        embedder = get_embeddings()
        q_emb = np.array([embedder.embed_query(query)], dtype=np.float32)
        faiss.normalize_L2(q_emb)

        top_dense_count = min(len(self.chunks), max(k * 4, 15))
        dense_distances, dense_indices = self.index.search(q_emb, top_dense_count)

        dense_scores_by_id: Dict[int, float] = {}
        dense_rank_by_id: Dict[int, int] = {}
        for rank_idx, (idx, dist) in enumerate(zip(dense_indices[0], dense_distances[0])):
            if idx >= 0:
                dense_scores_by_id[int(idx)] = float(dist)
                dense_rank_by_id[int(idx)] = rank_idx + 1

        # 2. Sparse BM25 Search
        query_tokens = self._tokenize(query)
        bm25_raw_scores = self.bm25.get_scores(query_tokens)
        bm25_ranked_indices = np.argsort(bm25_raw_scores)[::-1][:top_dense_count]

        bm25_scores_by_id: Dict[int, float] = {}
        bm25_rank_by_id: Dict[int, int] = {}
        for rank_idx, idx in enumerate(bm25_ranked_indices):
            bm25_scores_by_id[int(idx)] = float(bm25_raw_scores[idx])
            bm25_rank_by_id[int(idx)] = rank_idx + 1

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF Score = 1 / (60 + dense_rank) + 1 / (60 + bm25_rank)
        RRF_K = 60
        candidate_ids = set(dense_scores_by_id.keys()) | set(bm25_scores_by_id.keys())
        rrf_results = []

        for cid in candidate_ids:
            chunk = self.chunks[cid]
            meta = chunk.get("metadata", {})

            # Optional Metadata Filter (if enabled)
            if self.enable_metadata_filter or doc_type_filter or machine_filter:
                if doc_type_filter and meta.get("doc_type") != doc_type_filter:
                    continue
                if machine_filter and machine_filter.lower() not in chunk["page_content"].lower():
                    continue

            d_rank = dense_rank_by_id.get(cid, top_dense_count + 10)
            b_rank = bm25_rank_by_id.get(cid, top_dense_count + 10)

            score_dense_component = 1.0 / (RRF_K + d_rank)
            score_bm25_component = 1.0 / (RRF_K + b_rank)
            rrf_score = score_dense_component + score_bm25_component

            rrf_results.append({
                "id": cid,
                "content": chunk["page_content"],
                "source": meta.get("source", "manual"),
                "doc_type": meta.get("doc_type", "technical"),
                "score": round(rrf_score, 5),
                "dense_score": round(dense_scores_by_id.get(cid, 0.0), 4),
                "dense_rank": d_rank if cid in dense_rank_by_id else None,
                "bm25_score": round(bm25_scores_by_id.get(cid, 0.0), 4),
                "bm25_rank": b_rank if cid in bm25_rank_by_id else None,
                "retrieval_type": "hybrid_rrf"
            })

        # Sort by fused RRF score descending
        rrf_results.sort(key=lambda x: x["score"], reverse=True)

        for fused_rank, item in enumerate(rrf_results, 1):
            item["fused_rank"] = fused_rank

        return rrf_results[:k]

def get_retriever(enable_metadata_filter: bool = False, enable_reranker: bool = False) -> HybridIndustrialRetriever:
    global _retriever_instance
    if _retriever_instance is None:
        _retriever_instance = HybridIndustrialRetriever(
            enable_metadata_filter=enable_metadata_filter,
            enable_reranker=enable_reranker
        )
    return _retriever_instance
