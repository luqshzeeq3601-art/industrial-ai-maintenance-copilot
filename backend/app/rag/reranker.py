"""Cross-encoder reranker wrapper (MiniLM) with strict top-N enforcement."""
from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("copilot.rag.reranker")

_RERANKER_SINGLETONS: Dict[str, Any] = {}


def get_cross_encoder(model_name: str = "cross-encoder/ms-marco-MiniLM-L6-v2"):
    """Lazily load (and cache) a CrossEncoder instance."""
    global _RERANKER_SINGLETONS
    if model_name not in _RERANKER_SINGLETONS:
        from sentence_transformers import CrossEncoder

        _RERANKER_SINGLETONS[model_name] = CrossEncoder(model_name)
    return _RERANKER_SINGLETONS[model_name]


def clear_reranker_cache() -> None:
    _RERANKER_SINGLETONS.clear()


def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    top_n: int,
    model_name: str = "cross-encoder/ms-marco-MiniLM-L6-v2",
) -> List[Dict[str, Any]]:
    """Rerank at most top_n candidates with the cross-encoder.

    - Only the first top_n candidates (already RRF-ordered) are scored.
    - The original RRF score is preserved in `score`; the cross-encoder logit
      is stored separately in `reranker_score`.
    - Output is sorted by reranker_score descending; ranks stored in
      `reranker_rank`. Candidates beyond top_n are unreachable here by design
      (caller slices first); this function defensively slices again.
    """
    subset = list(candidates[:top_n])
    if not subset:
        return []
    try:
        model = get_cross_encoder(model_name)
    except Exception as e:
        logger.warning(f"Reranker load failed ({model_name}): {e}. Returning RRF order.")
        out = []
        for rank, c in enumerate(subset, 1):
            d = dict(c)
            d["reranker_score"] = None
            d["reranker_rank"] = None
            d["reranker_model"] = model_name
            out.append(d)
        return out

    pairs = [(query, c.get("content", "")) for c in subset]
    try:
        scores = model.predict(pairs)
    except Exception as e:
        logger.warning(f"Reranker predict failed: {e}. Returning RRF order.")
        out = []
        for c in subset:
            d = dict(c)
            d["reranker_score"] = None
            d["reranker_rank"] = None
            d["reranker_model"] = model_name
            out.append(d)
        return out

    rescored: List[Dict[str, Any]] = []
    for c, s in zip(subset, scores):
        d = dict(c)
        d["reranker_score"] = round(float(s), 5)
        d["reranker_model"] = model_name
        rescored.append(d)
    rescored.sort(key=lambda x: x["reranker_score"], reverse=True)
    for rank, d in enumerate(rescored, 1):
        d["reranker_rank"] = rank
    return rescored
