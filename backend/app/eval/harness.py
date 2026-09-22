"""Shared eval harness - single EXTRACTED import target for all scripts.

Fixes graph INFERRED edges:
- `evaluate_retrieval_configuration() --uses--> HybridIndustrialRetriever`
- `evaluate_retrieval() --uses--> HybridIndustrialRetriever`
- `build_experiment_index() --calls--> get_model_revision()`

Scripts (`scripts/evaluate.py`, `evaluate_ci.py`, `evaluate_extended.py`,
`run_retrieval_experiments.py`) must import from here so `graphify`
sees explicit call edges.
"""
import time
from pathlib import Path
from typing import List, Dict, Any
import numpy as np

from backend.app.rag.retriever import HybridIndustrialRetriever, get_retriever
from backend.app.rag.embeddings import get_model_revision

__all__ = [
    "evaluate_retrieval_configuration",
    "evaluate_retrieval",
    "build_experiment_index",
]


def evaluate_retrieval_configuration(
    retriever: HybridIndustrialRetriever,
    dataset: List[Dict[str, Any]],
    config_name: str,
) -> Dict[str, Any]:
    latencies, rr_scores = [], []
    r1_hits = r3_hits = r5_hits = total = 0
    for item in dataset:
        expected = item.get("expected_source")
        if not expected:
            continue
        total += 1
        t0 = time.time()
        results = retriever.retrieve(item["query"], k=5)
        latencies.append(time.time() - t0)
        sources = [r.get("source") for r in results]
        if sources[:1] == [expected]:
            r1_hits += 1
        if expected in sources[:3]:
            r3_hits += 1
        if expected in sources[:5]:
            r5_hits += 1
        rr_scores.append(1.0 / (sources.index(expected) + 1) if expected in sources else 0.0)
    return {
        "configuration": config_name,
        "total_queries": total,
        "recall_at_1_pct": round(r1_hits / total * 100, 1) if total else 0.0,
        "recall_at_3_pct": round(r3_hits / total * 100, 1) if total else 0.0,
        "recall_at_5_pct": round(r5_hits / total * 100, 1) if total else 0.0,
        "mrr": round(float(np.mean(rr_scores)), 3) if rr_scores else 0.0,
        "latency_p50_ms": round(float(np.percentile(latencies, 50)) * 1000, 1) if latencies else 0.0,
        "latency_p95_ms": round(float(np.percentile(latencies, 95)) * 1000, 1) if latencies else 0.0,
    }


def evaluate_retrieval(dataset: List[Dict[str, Any]], k: int = 5) -> Dict[str, Any]:
    return evaluate_retrieval_configuration(get_retriever(), dataset, f"default-k{k}")


def build_experiment_index(vector_store_dir: Path, embedding_model: str) -> Dict[str, Any]:
    from backend.app.rag.ingest import ingest_and_index
    ingest_and_index(vector_store_dir=vector_store_dir, embedding_model=embedding_model)
    return {"vector_store_dir": str(vector_store_dir), "model_revision": get_model_revision(embedding_model)}
