"""Extended 100-case live benchmark suite for Industrial Maintenance Copilot.
Measures domain guardrail accuracy, hybrid RAG retrieval performance across 5 domains,
and projects LLM token cost under on-prem Ollama vs Azure OpenAI.
"""
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import numpy as np

from backend.app.rag.retriever import get_retriever, HybridIndustrialRetriever
from backend.app.guardrails.abstention import check_query_domain, evaluate_evidence
from backend.app.llm.factory import calculate_llm_cost

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def run_extended_benchmark(
    dataset_path: Path = Path("backend/tests/eval_dataset_extended.json"),
    report_output_path: Path = Path("reports/production_gap_upgrade_report.json")
) -> Dict[str, Any]:
    """Execute extended 100-case evaluation benchmark."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    print("\n" + "=" * 70)
    print("   INDUSTRIAL MAINTENANCE COPILOT — EXTENDED 100-CASE BENCHMARK")
    print(f"   Total Test Cases: {len(dataset)}")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z")
    print("=" * 70 + "\n")

    start_time = time.time()

    # -------------------------------------------------------------
    # 1. Guardrail Domain Classification & Safety Abstention
    # -------------------------------------------------------------
    print("--- 1. Evaluating Domain Classification & Guardrail Abstention ---")
    tp = fp = tn = fn = 0
    guardrail_cases = []

    for item in dataset:
        q = item["query"]
        is_answerable = item["is_answerable"]
        in_domain, refusal = check_query_domain(q)

        if is_answerable:
            if in_domain:
                tp += 1
            else:
                fn += 1
                guardrail_cases.append({"id": item["id"], "query": q, "status": "FALSE_NEGATIVE"})
        else:
            if not in_domain:
                tn += 1
            else:
                fp += 1
                guardrail_cases.append({"id": item["id"], "query": q, "status": "FALSE_POSITIVE"})

    total_guardrail = tp + fp + tn + fn
    accuracy = round(((tp + tn) / total_guardrail) * 100, 2) if total_guardrail else 0.0
    precision = round((tp / (tp + fp)) * 100, 2) if (tp + fp) > 0 else 0.0
    recall = round((tp / (tp + fn)) * 100, 2) if (tp + fn) > 0 else 0.0
    f1 = round((2 * precision * recall) / (precision + recall), 2) if (precision + recall) > 0 else 0.0

    print(f"  Total Evaluated: {total_guardrail}")
    print(f"  True Positives (In-Domain Accepted):   {tp}")
    print(f"  True Negatives (Out-of-Scope Blocked): {tn}")
    print(f"  False Positives (Leakage):             {fp}")
    print(f"  False Negatives (Over-Abstention):     {fn}")
    print(f"  Guardrail Accuracy:                    {accuracy}%")
    print(f"  Precision:                             {precision}%")
    print(f"  Recall:                                {recall}%")
    print(f"  F1-Score:                              {f1}%\n")

    # -------------------------------------------------------------
    # 2. Hybrid RAG Retrieval (FAISS + BM25 with RRF)
    # -------------------------------------------------------------
    print("--- 2. Evaluating Hybrid RAG Retrieval Performance ---")
    retriever = get_retriever()
    # Warm up model weights
    retriever.retrieve("warmup query", k=1)

    r1_hits = 0
    r3_hits = 0
    r5_hits = 0
    rr_scores = []
    latencies = []
    domain_breakdown: Dict[str, Dict[str, Any]] = {}
    rag_queries = 0

    for item in dataset:
        expected_source = item.get("expected_source")
        if not expected_source or not item.get("is_answerable"):
            continue

        rag_queries += 1
        query = item["query"]
        domain = item.get("domain", "general")
        if domain not in domain_breakdown:
            domain_breakdown[domain] = {"total": 0, "r1": 0, "r3": 0, "r5": 0, "rr": []}

        domain_breakdown[domain]["total"] += 1

        t0 = time.time()
        results = retriever.retrieve(query, k=5)
        duration = time.time() - t0
        latencies.append(duration)

        sources = [r.get("source") for r in results]

        if len(sources) > 0 and expected_source == sources[0]:
            r1_hits += 1
            domain_breakdown[domain]["r1"] += 1
        if expected_source in sources[:3]:
            r3_hits += 1
            domain_breakdown[domain]["r3"] += 1
        if expected_source in sources[:5]:
            r5_hits += 1
            domain_breakdown[domain]["r5"] += 1

        if expected_source in sources:
            rank = sources.index(expected_source) + 1
            rr = 1.0 / rank
            rr_scores.append(rr)
            domain_breakdown[domain]["rr"].append(rr)
        else:
            rr_scores.append(0.0)
            domain_breakdown[domain]["rr"].append(0.0)

    recall_1 = round((r1_hits / rag_queries) * 100, 2) if rag_queries else 0.0
    recall_3 = round((r3_hits / rag_queries) * 100, 2) if rag_queries else 0.0
    recall_5 = round((r5_hits / rag_queries) * 100, 2) if rag_queries else 0.0
    mrr = round(float(np.mean(rr_scores)), 3) if rr_scores else 0.0
    p50_ms = round(float(np.percentile(latencies, 50)) * 1000, 1) if latencies else 0.0
    p95_ms = round(float(np.percentile(latencies, 95)) * 1000, 1) if latencies else 0.0

    print(f"  RAG Queries Evaluated: {rag_queries}")
    print(f"  Recall@1:              {recall_1}%")
    print(f"  Recall@3:              {recall_3}%")
    print(f"  Recall@5:              {recall_5}%")
    print(f"  MRR (Mean Reciprocal): {mrr}")
    print(f"  Latency p50:           {p50_ms} ms")
    print(f"  Latency p95:           {p95_ms} ms\n")

    print("  --- Domain Breakdown ---")
    domain_summary = {}
    for d, stats in domain_breakdown.items():
        tot = stats["total"]
        r3_pct = round((stats["r3"] / tot) * 100, 1) if tot else 0.0
        d_mrr = round(float(np.mean(stats["rr"])), 3) if stats["rr"] else 0.0
        domain_summary[d] = {
            "queries": tot,
            "recall_at_3_pct": r3_pct,
            "mrr": d_mrr
        }
        print(f"  - {d.capitalize():<14}: {tot} queries | Recall@3: {r3_pct}% | MRR: {d_mrr}")

    # -------------------------------------------------------------
    # 3. LLM Token Usage & Cost Estimation
    # -------------------------------------------------------------
    print("\n--- 3. LLM Token & Inference Cost Modeling ---")
    # Estimated average tokens per multi-agent industrial workflow
    avg_prompt_tokens_per_query = 650
    avg_completion_tokens_per_query = 280
    monthly_estimated_queries = 10000

    ollama_monthly_cost = calculate_llm_cost(
        prompt_tokens=avg_prompt_tokens_per_query * monthly_estimated_queries,
        completion_tokens=avg_completion_tokens_per_query * monthly_estimated_queries,
        provider="ollama"
    )
    azure_monthly_cost = calculate_llm_cost(
        prompt_tokens=avg_prompt_tokens_per_query * monthly_estimated_queries,
        completion_tokens=avg_completion_tokens_per_query * monthly_estimated_queries,
        provider="azure_openai"
    )

    print(f"  Workload Model: {monthly_estimated_queries:,} queries/month ({avg_prompt_tokens_per_query} in / {avg_completion_tokens_per_query} out per turn)")
    print(f"  On-Premise Ollama Monthly Marginal API Cost: ${ollama_monthly_cost:.2f}")
    print(f"  Azure OpenAI Managed API Estimated Monthly Cost: ${azure_monthly_cost:.2f}")

    # -------------------------------------------------------------
    # 4. Generate Machine-Readable Report
    # -------------------------------------------------------------
    total_benchmark_time = round(time.time() - start_time, 2)
    report_data = {
        "benchmark_name": "Production-Gap Extended Upgrade Benchmark",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_duration_seconds": total_benchmark_time,
        "total_test_cases": len(dataset),
        "guardrail_evaluation": {
            "total_cases": total_guardrail,
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "accuracy_pct": accuracy,
            "precision_pct": precision,
            "recall_pct": recall,
            "f1_score_pct": f1,
            "failures": guardrail_cases
        },
        "retrieval_evaluation": {
            "total_queries": rag_queries,
            "recall_at_1_pct": recall_1,
            "recall_at_3_pct": recall_3,
            "recall_at_5_pct": recall_5,
            "mrr": mrr,
            "latency_p50_ms": p50_ms,
            "latency_p95_ms": p95_ms,
            "domain_breakdown": domain_summary
        },
        "cost_modeling": {
            "simulated_monthly_queries": monthly_estimated_queries,
            "avg_prompt_tokens": avg_prompt_tokens_per_query,
            "avg_completion_tokens": avg_completion_tokens_per_query,
            "ollama_monthly_cost_usd": ollama_monthly_cost,
            "azure_openai_monthly_cost_usd": azure_monthly_cost
        },
        "status": "PASSED" if accuracy >= 95.0 and recall_3 >= 90.0 else "WARNING"
    }

    with open(report_output_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    print("\n" + "=" * 70)
    print(f"   Benchmark Completed in {total_benchmark_time}s")
    print(f"   Report persisted to: {report_output_path}")
    print("=" * 70 + "\n")

    return report_data


if __name__ == "__main__":
    run_extended_benchmark()
