"""Hybrid Retriever combining Native FAISS dense vector search and BM25 with Reciprocal Rank Fusion (RRF).

Extensions (retrieval optimization plan):
- Embedding model keyed per instance (model-specific prompting, normalized float32).
- Optional cross-encoder reranking over RRF top-N (depth 8/12/20); RRF score
  preserved in `score`, reranker logit in `reranker_score`.
- Normalized explicit predicates (case-insensitive) matched against real
  metadata (source/doc_type/machine_ids/fault_codes/equipment_domain) instead
  of content substrings. Legacy args retained as aliases.
- Explicit caller filters are strict. Automatically inferred exact identifiers
  use filter-first ranking with unfiltered backfill (never empty due to sparse
  metadata).
- Optional deterministic query expansion (<=2 variants, RRF fusion, no LLM).

Backward compatible: existing calls `retrieve(query, k, doc_type_filter,
machine_filter, fault_code_filter, filters)` and returned fields keep working;
new metadata/reranker fields are additive.
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import faiss
import numpy as np
from rank_bm25 import BM25Okapi
from backend.app.config import settings
from backend.app.rag.embeddings import get_embeddings, embed_query_normalized
from backend.app.rag.model_configs import RERANKER_MODEL_NAME
from backend.app.rag.metadata import (
    normalize_predicate_value,
    infer_identifiers_from_query,
)
from backend.app.rag.query_expansion import generate_query_variants
from backend.app.rag.ingest import (
    CHUNKS_METADATA_FILE,
    INDEX_FILE,
    MANIFEST_FILE,
    calculate_sha256,
    ingest_and_index,
)

logger = logging.getLogger("copilot.rag.retriever")
_retriever_instance = None
_retriever_instances_by_key: Dict[str, "HybridIndustrialRetriever"] = {}


def _instance_key(
    vector_store_dir: Optional[Path],
    embedding_model: Optional[str],
    enable_reranker: bool,
    rerank_depth: int,
    enable_expansion: bool,
) -> str:
    vs = str(Path(vector_store_dir) if vector_store_dir else settings.VECTOR_STORE_DIR)
    em = embedding_model or settings.EMBEDDING_MODEL_NAME
    return f"{vs}||{em}||rr={int(enable_reranker)}:{rerank_depth}||exp={int(enable_expansion)}"


class HybridIndustrialRetriever:
    def __init__(
        self,
        enable_metadata_filter: bool = False,
        enable_reranker: bool = False,
        vector_store_dir: Optional[Path] = None,
        embedding_model: Optional[str] = None,
        rerank_depth: int = 12,
        reranker_model: Optional[str] = None,
        enable_query_expansion: bool = False,
    ):
        self.index: Optional[faiss.Index] = None
        self.chunks: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.tokenized_corpus: List[List[str]] = []
        self.enable_metadata_filter = enable_metadata_filter
        self.enable_reranker = enable_reranker or settings.ENABLE_RERANKER
        self.vector_store_dir = Path(vector_store_dir) if vector_store_dir else settings.VECTOR_STORE_DIR
        self.embedding_model = embedding_model or settings.EMBEDDING_MODEL_NAME
        self.rerank_depth = int(rerank_depth or settings.RERANKER_CANDIDATE_DEPTH)
        self.reranker_model = reranker_model or settings.RERANKER_MODEL_NAME
        self.enable_query_expansion = enable_query_expansion or settings.ENABLE_QUERY_EXPANSION
        self.manifest: Dict[str, Any] = {}
        self._initialize()

    def _initialize(self):
        index_path = self.vector_store_dir / INDEX_FILE
        cache_path = self.vector_store_dir / CHUNKS_METADATA_FILE
        manifest_path = self.vector_store_dir / MANIFEST_FILE

        # Verify integrity and auto-ingest if absent or invalid.
        # For isolated experiment dirs this builds with the instance's own
        # embedding model + default recipe; experiment harness pre-builds with
        # explicit recipes instead.
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
            # Never auto-rebuild the PRODUCTION dir with experimental settings:
            # production rebuild uses production defaults only.
            is_production = Path(self.vector_store_dir).resolve() == Path(settings.VECTOR_STORE_DIR).resolve()
            logger.info("Initializing vector store via secure ingestion...")
            if is_production and self.vector_store_dir == settings.VECTOR_STORE_DIR and self.embedding_model == settings.EMBEDDING_MODEL_NAME:
                ingest_and_index()
            else:
                ingest_and_index(
                    vector_store_dir=self.vector_store_dir,
                    embedding_model=self.embedding_model,
                )

        # 1. Native FAISS index loading (no unsafe pickle!) wrapped in VectorStore
        # abstraction (VECTOR_BACKEND=faiss default; milvus/azure_search via factory).
        from backend.app.rag.vector_base import FaissStore
        self.index = faiss.read_index(str(index_path))
        self.vector_store = FaissStore(self.index)

        # 2. Load chunk metadata
        with open(cache_path, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)
        except Exception:
            self.manifest = {}

        # 3. Initialize BM25 with tokenized corpus
        self.tokenized_corpus = [
            self._tokenize(chunk["page_content"]) for chunk in self.chunks
        ]
        self.bm25 = BM25Okapi(self.tokenized_corpus)
        logger.info(f"Hybrid retriever ready: {self.index.ntotal} vectors, {len(self.chunks)} BM25 documents.")

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return text.lower().replace("-", " ").replace("_", " ").split()

    # -- predicate helpers -------------------------------------------------
    @staticmethod
    def _extract_explicit_predicates(
        doc_type_filter: Optional[str],
        machine_filter: Optional[str],
        fault_code_filter: Optional[str],
        filters: Optional[Dict[str, Any]],
    ) -> Dict[str, str]:
        active = dict(filters or {})
        # Legacy aliases: machine, fault_code; canonical: machine_id, fault_code, doc_type, equipment_domain.
        eff_doc_type = doc_type_filter or active.get("doc_type") or ""
        eff_machine = machine_filter or active.get("machine_id") or active.get("machine") or ""
        eff_fault = fault_code_filter or active.get("fault_code") or ""
        eff_domain = active.get("equipment_domain") or active.get("domain") or ""
        out: Dict[str, str] = {}
        if eff_doc_type:
            out["doc_type"] = normalize_predicate_value(eff_doc_type)
        if eff_machine:
            out["machine_id"] = normalize_predicate_value(eff_machine)
        if eff_fault:
            out["fault_code"] = normalize_predicate_value(eff_fault)
        if eff_domain:
            out["equipment_domain"] = normalize_predicate_value(eff_domain)
        return out

    @staticmethod
    def _chunk_matches_predicate(chunk_meta: Dict[str, Any], chunk_text: str, pred: Dict[str, str]) -> bool:
        if "doc_type" in pred:
            if normalize_predicate_value(chunk_meta.get("doc_type", "")) != pred["doc_type"]:
                return False
        if "equipment_domain" in pred:
            if normalize_predicate_value(chunk_meta.get("equipment_domain", "")) != pred["equipment_domain"]:
                return False
        if "machine_id" in pred:
            want = pred["machine_id"]
            ids = [normalize_predicate_value(v) for v in (chunk_meta.get("machine_ids", []) or [])]
            models = [normalize_predicate_value(v) for v in (chunk_meta.get("equipment_models", []) or [])]
            src = normalize_predicate_value(chunk_meta.get("source", ""))
            if want not in ids and want not in models and want not in src:
                return False
        if "fault_code" in pred:
            want = pred["fault_code"]
            codes = [normalize_predicate_value(v) for v in (chunk_meta.get("fault_codes", []) or [])]
            if want not in codes:
                return False
        return True

    def _fused_search(
        self,
        query: str,
        k: int,
        explicit_pred: Dict[str, str],
        inferred_pred: Optional[Dict[str, str]] = None,
        candidate_multiplier: int = 4,
        candidate_floor: int = 15,
    ) -> List[Dict[str, Any]]:
        """Core dense+BM25+RRF search with strict explicit filtering."""
        if not self.chunks or self.index is None:
            return []
        # Adaptive floor: tiny plant indexes (<500 chunks) don't need 15-wide
        # dense fan-out; keeps p95 flat without changing ranking.
        floor = 8 if len(self.chunks) < 500 else candidate_floor
        top_dense_count = min(len(self.chunks), max(k * candidate_multiplier, floor))

        # 1. Dense search via VectorStore abstraction (FAISS default).
        q_emb = embed_query_normalized(query, self.embedding_model).reshape(1, -1)
        dense_distances, dense_indices = self.vector_store.search(q_emb, top_dense_count)
        dense_scores_by_id: Dict[int, float] = {}
        dense_rank_by_id: Dict[int, int] = {}
        for rank_idx, (idx, dist) in enumerate(zip(dense_indices[0], dense_distances[0])):
            if int(idx) >= 0:
                dense_scores_by_id[int(idx)] = float(dist)
                dense_rank_by_id[int(idx)] = rank_idx + 1

        # 2. Sparse BM25 search.
        query_tokens = self._tokenize(query)
        bm25_raw_scores = self.bm25.get_scores(query_tokens)
        bm25_ranked_indices = np.argsort(bm25_raw_scores)[::-1][:top_dense_count]
        bm25_scores_by_id: Dict[int, float] = {}
        bm25_rank_by_id: Dict[int, int] = {}
        for rank_idx, idx in enumerate(bm25_ranked_indices):
            bm25_scores_by_id[int(idx)] = float(bm25_raw_scores[idx])
            bm25_rank_by_id[int(idx)] = rank_idx + 1

        # 3. RRF fusion with exact metadata predicate filtering.
        RRF_K = 60
        candidate_ids = set(dense_scores_by_id.keys()) | set(bm25_scores_by_id.keys())
        rrf_results = []
        for cid in candidate_ids:
            chunk = self.chunks[cid]
            meta = chunk.get("metadata", {})
            if explicit_pred and not self._chunk_matches_predicate(meta, chunk.get("page_content", ""), explicit_pred):
                continue
            if inferred_pred and not self._chunk_matches_predicate(meta, chunk.get("page_content", ""), inferred_pred):
                continue
            d_rank = dense_rank_by_id.get(cid, top_dense_count + 10)
            b_rank = bm25_rank_by_id.get(cid, top_dense_count + 10)
            rrf_score = 1.0 / (RRF_K + d_rank) + 1.0 / (RRF_K + b_rank)
            rrf_results.append({
                "id": cid,
                "content": chunk["page_content"],
                "source": meta.get("source", "manual"),
                "doc_type": meta.get("doc_type", "technical"),
                "score": round(rrf_score, 5),
                "dense_score": round(dense_scores_by_id.get(cid, 0.0), 4),
                "dense_rank": dense_rank_by_id.get(cid),
                "bm25_score": round(bm25_scores_by_id.get(cid, 0.0), 4),
                "bm25_rank": bm25_rank_by_id.get(cid),
                "retrieval_type": "hybrid_rrf",
                # Additive rich metadata (backward compatible).
                "section_path": meta.get("section_path", ""),
                "page": meta.get("page", 0),
                "chunk_index": meta.get("chunk_index", cid),
                "equipment_models": meta.get("equipment_models", []),
                "machine_ids": meta.get("machine_ids", []),
                "fault_codes": meta.get("fault_codes", []),
                "equipment_domain": meta.get("equipment_domain", ""),
            })
        rrf_results.sort(key=lambda x: x["score"], reverse=True)
        for fused_rank, item in enumerate(rrf_results, 1):
            item["fused_rank"] = fused_rank
        return rrf_results

    def retrieve(
        self,
        query: str,
        k: int = 4,
        doc_type_filter: Optional[str] = None,
        machine_filter: Optional[str] = None,
        fault_code_filter: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve top-k documents using RRF with exact metadata predicates.

        Explicit caller filters are strict. Inferred exact identifiers
        (EQ-#### / fault codes in the query text) use filter-first ranking
        with unfiltered backfill so sparse metadata never yields empty results.
        """
        if not self.chunks or self.index is None:
            return []
        explicit_pred = self._extract_explicit_predicates(doc_type_filter, machine_filter, fault_code_filter, filters)

        queries = [query]
        if self.enable_query_expansion:
            queries = [query] + generate_query_variants(query, max_variants=2)

        # Multi-query RRF fusion across expansion variants.
        if len(queries) > 1:
            per_variant_ranks: Dict[int, List[int]] = {}
            per_variant_items: Dict[int, Dict[str, Any]] = {}
            for v_idx, vq in enumerate(queries):
                # Expansion variants respect strict explicit filters too.
                res = self._fused_search(vq, k=max(k * 4, 15), explicit_pred=explicit_pred)
                for rank, item in enumerate(res, 1):
                    cid = item["id"]
                    per_variant_ranks.setdefault(cid, []).append(rank)
                    if cid not in per_variant_items:
                        per_variant_items[cid] = item
            fused = []
            for cid, ranks in per_variant_ranks.items():
                item = dict(per_variant_items[cid])
                item["score"] = round(sum(1.0 / (60 + r) for r in ranks), 5)
                item["retrieval_type"] = "hybrid_rrf_expanded"
                fused.append(item)
            fused.sort(key=lambda x: x["score"], reverse=True)
            for i, item in enumerate(fused, 1):
                item["fused_rank"] = i
            rrf_results = fused
        else:
            # Inferred-identifier filter-first with backfill (only when no explicit filters).
            # Single fused search, then stable partition: matched chunks first (RRF
            # order preserved within each group), unmatched as backfill. This avoids
            # a second FAISS/BM25 pass so fault-code queries stay at single-query
            # latency while never returning empty due to sparse metadata.
            rrf_results = self._fused_search(query, k=max(k * 4, 15), explicit_pred=explicit_pred)
            if not explicit_pred:
                inferred = infer_identifiers_from_query(query)
                inferred_pred: Dict[str, str] = {}
                if inferred["machine_ids"]:
                    inferred_pred["machine_id"] = normalize_predicate_value(inferred["machine_ids"][0])
                elif inferred["fault_codes"]:
                    inferred_pred["fault_code"] = normalize_predicate_value(inferred["fault_codes"][0])
                if inferred_pred and rrf_results:
                    matched = [d for d in rrf_results if self._chunk_matches_predicate(
                        {"machine_ids": d.get("machine_ids", []), "fault_codes": d.get("fault_codes", []),
                         "equipment_models": d.get("equipment_models", []), "source": d.get("source", ""),
                         "doc_type": d.get("doc_type", ""), "equipment_domain": d.get("equipment_domain", "")},
                        d.get("content", ""), inferred_pred)]
                    if matched and len(matched) < len(rrf_results):
                        matched_ids = {d["id"] for d in matched}
                        backfill = [d for d in rrf_results if d["id"] not in matched_ids]
                        rrf_results = matched + backfill
                        for i, item in enumerate(rrf_results, 1):
                            item["fused_rank"] = i

        # Optional reranking over RRF top-N only.
        if self.enable_reranker:
            from backend.app.rag.reranker import rerank_candidates

            depth = max(1, min(self.rerank_depth, len(rrf_results)))
            top_slice = rrf_results[:depth]
            reranked_top = rerank_candidates(query, top_slice, top_n=depth, model_name=self.reranker_model)
            # Preserve RRF order info; final order is reranker order for the top slice.
            tail = rrf_results[depth:]
            for item in tail:
                item["reranker_score"] = None
                item["reranker_rank"] = None
                item["reranker_model"] = self.reranker_model
            combined = reranked_top + tail
            # Return top-k by reranked order (top slice reranked, tail in RRF order).
            result = combined[:k]
            for item in result:
                item["retrieval_type"] = "hybrid_rrf_reranked"
            return result

        return rrf_results[:k]


def get_retriever(
    enable_metadata_filter: bool = False,
    enable_reranker: bool = False,
    vector_store_dir: Optional[Path] = None,
    embedding_model: Optional[str] = None,
    rerank_depth: Optional[int] = None,
    enable_query_expansion: bool = False,
) -> HybridIndustrialRetriever:
    """Backward-compatible singleton getter with per-config isolation.

    Default call (no optional paths/models) returns the legacy global singleton.
    Any non-default configuration returns a separately cached instance so
    experiments cannot pollute production state (singleton isolation).
    """
    global _retriever_instance
    is_default = (
        vector_store_dir is None
        and embedding_model is None
        and rerank_depth is None
        and not enable_query_expansion
    )
    if is_default:
        if _retriever_instance is None:
            _retriever_instance = HybridIndustrialRetriever(
                enable_metadata_filter=enable_metadata_filter,
                enable_reranker=enable_reranker,
            )
        return _retriever_instance
    key = _instance_key(vector_store_dir, embedding_model, enable_reranker, int(rerank_depth or settings.RERANKER_CANDIDATE_DEPTH), enable_query_expansion)
    if key not in _retriever_instances_by_key:
        _retriever_instances_by_key[key] = HybridIndustrialRetriever(
            enable_metadata_filter=enable_metadata_filter,
            enable_reranker=enable_reranker,
            vector_store_dir=vector_store_dir,
            embedding_model=embedding_model,
            rerank_depth=int(rerank_depth or settings.RERANKER_CANDIDATE_DEPTH),
            enable_query_expansion=enable_query_expansion,
        )
    return _retriever_instances_by_key[key]


def clear_retriever_cache() -> None:
    global _retriever_instance
    _retriever_instance = None
    _retriever_instances_by_key.clear()
