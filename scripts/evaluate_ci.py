"""Deterministic offline CI evaluation runner for automated verification."""
import json
import time
from pathlib import Path
import numpy as np
from backend.app.rag.retriever import get_retriever
from backend.app.guardrails.abstention import check_query_domain, evaluate_evidence

def run_ci_evaluation():
    dataset_path = Path("backend/tests/eval_dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    print("\n=======================================================")
    print("   INDUSTRIAL AI COPILOT — DETERMINISTIC CI EVAL SUITE")
    print(f"   Total Test Cases: {len(dataset)}")
    print("=======================================================\n")

    retriever = get_retriever()

    # Guardrail metrics
    true_positives = 0  # in-domain correctly identified
    false_positives = 0 # out-of-domain falsely classified as in-domain
    true_negatives = 0  # out-of-domain correctly rejected
    false_negatives = 0 # in-domain falsely rejected

    # Retrieval metrics
    recall_at_1_hits = 0
    recall_at_3_hits = 0
    recall_at_5_hits = 0
    reciprocal_ranks = []
    retrieval_total = 0
    retrieval_latencies = []

    start_time = time.time()

    for item in dataset:
        qid = item["id"]
        query = item["query"]
        expected_source = item.get("expected_source")
        is_answerable = item["is_answerable"]

        # 1. Guardrail Domain Evaluation
        in_domain, refusal = check_query_domain(query)
        if is_answerable:
            if in_domain:
                true_positives += 1
            else:
                false_negatives += 1
        else:
            if not in_domain:
                true_negatives += 1
            else:
                false_positives += 1

        # 2. Retrieval Evaluation (on answerable manual queries)
        if expected_source:
            retrieval_total += 1
            t0 = time.time()
            results = retriever.retrieve(query, k=5)
            retrieval_latencies.append(time.time() - t0)

            sources = [r.get("source") for r in results]
            if len(sources) > 0 and expected_source == sources[0]:
                recall_at_1_hits += 1

            if expected_source in sources[:3]:
                recall_at_3_hits += 1

            if expected_source in sources[:5]:
                recall_at_5_hits += 1

            # Reciprocal rank calculation
            if expected_source in sources:
                rank = sources.index(expected_source) + 1
                reciprocal_ranks.append(1.0 / rank)
            else:
                reciprocal_ranks.append(0.0)

    elapsed = round(time.time() - start_time, 2)
    guardrail_total = true_positives + true_negatives + false_positives + false_negatives
    guardrail_acc = round(((true_positives + true_negatives) / guardrail_total) * 100, 1)

    precision = round((true_positives / (true_positives + false_positives)) * 100, 1) if (true_positives + false_positives) > 0 else 0
    recall = round((true_positives / (true_positives + false_negatives)) * 100, 1) if (true_positives + false_negatives) > 0 else 0

    r1_pct = round((recall_at_1_hits / retrieval_total) * 100, 1) if retrieval_total > 0 else 0
    r3_pct = round((recall_at_3_hits / retrieval_total) * 100, 1) if retrieval_total > 0 else 0
    r5_pct = round((recall_at_5_hits / retrieval_total) * 100, 1) if retrieval_total > 0 else 0
    mrr = round(float(np.mean(reciprocal_ranks)), 3) if reciprocal_ranks else 0.0

    p50_lat = round(float(np.percentile(retrieval_latencies, 50)) * 1000, 1) if retrieval_latencies else 0.0
    p95_lat = round(float(np.percentile(retrieval_latencies, 95)) * 1000, 1) if retrieval_latencies else 0.0

    print("=== CI Benchmark Results ===")
    print(f"  - Domain Classification Accuracy: {true_positives + true_negatives}/{guardrail_total} ({guardrail_acc}%)")
    print(f"    Confusion Matrix: TP={true_positives}, FP={false_positives}, TN={true_negatives}, FN={false_negatives}")
    print(f"    Precision: {precision}%, Recall: {recall}%")
    print(f"  - Hybrid Retrieval RRF Recall@1: {recall_at_1_hits}/{retrieval_total} ({r1_pct}%)")
    print(f"  - Hybrid Retrieval RRF Recall@3: {recall_at_3_hits}/{retrieval_total} ({r3_pct}%)")
    print(f"  - Hybrid Retrieval RRF Recall@5: {recall_at_5_hits}/{retrieval_total} ({r5_pct}%)")
    print(f"  - Mean Reciprocal Rank (MRR): {mrr}")
    print(f"  - Retrieval Latency: p50 = {p50_lat}ms, p95 = {p95_lat}ms")
    print(f"  - Execution Time: {elapsed}s\n")

    # CI Quality Gates
    assert guardrail_acc >= 95.0, f"Guardrail accuracy {guardrail_acc}% regressed below 95%"
    assert r3_pct >= 90.0, f"Recall@3 {r3_pct}% regressed below 90%"
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("[PASS] All CI Quality Gates PASSED.")

if __name__ == "__main__":
    run_ci_evaluation()
