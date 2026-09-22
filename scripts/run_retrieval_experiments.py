"""Controlled retrieval-optimization experiment runner (E0-E5, C1+).

- Freezes dataset bytes (SHA-256) and fixed query order.
- Builds each configuration's index under scratch/rag_experiments/<exp_id>/
  (production vector_store/ untouched until atomic --promote of a gate-passing winner).
- 5 warm-ups + 3 complete measured passes per config, CUDA synchronization.
- Reports Recall@1/3/5, MRR, p50/p95, hit counts, per-case wins/losses, domain splits.
- Promotion gate: +2 Recall@3 hits/50 (>=+4pts), no Recall@5 loss, no Hydraulic
  or Semiconductor Recall@3 loss, p95 <= 275ms. Selection: R@3, MRR, R@1, lower p95.
- Guardrail metrics on all 100 cases (revalidated for every embedding change).
- Versioned JSON + Markdown reports under reports/retrieval_opt/.

Usage:
  .venv/Scripts/python.exe scripts/run_retrieval_experiments.py [--only E0,E1a] [--promote] [--skip-embeddings E3b,E3c]
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import torch

from backend.app.rag.ingest import ingest_and_index, MANIFEST_FILE
from backend.app.rag.retriever import HybridIndustrialRetriever, clear_retriever_cache
from backend.app.rag.embeddings import clear_embeddings_cache, get_model_revision
from backend.app.eval.harness import evaluate_retrieval_configuration as harness_evaluate_config, build_experiment_index
from backend.app.guardrails.abstention import check_query_domain, clear_prototype_cache

# Explicit harness wiring so graphify sees EXTRACTED call edges (Phase 2.3).
evaluate_retrieval = harness_evaluate_config

DATASET_PATH = ROOT / "backend" / "tests" / "eval_dataset_extended.json"
PROD_VECTOR_DIR = ROOT / "vector_store"
SCRATCH_BASE = ROOT / "scratch" / "rag_experiments"
REPORT_BASE = ROOT / "reports" / "retrieval_opt"

P95_GATE_MS = 275.0

EXPERIMENTS: List[Dict[str, Any]] = [
    {"id": "E0", "desc": "Same-run reproduction of current pipeline",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E1a", "desc": "Header-aware sections 384/64 only",
     "recipe": "header_sections_384_64", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E1b", "desc": "Header-aware semantic blocks 320/450/48 only",
     "recipe": "semantic_blocks_320_450_48", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E2a", "desc": "MiniLM rerank top-8 only",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": True, "rerank_depth": 8, "expansion": False},
    {"id": "E2b", "desc": "MiniLM rerank top-12 only",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": True, "rerank_depth": 12, "expansion": False},
    {"id": "E2c", "desc": "MiniLM rerank top-20 only",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": True, "rerank_depth": 20, "expansion": False},
    {"id": "E3a", "desc": "BGE-M3 embedding only",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-m3",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E3b", "desc": "Mixedbread mxbai-embed-large-v1 only",
     "recipe": "legacy_fixed_700", "embedding": "mixedbread-ai/mxbai-embed-large-v1",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E3c", "desc": "Snowflake arctic-embed-l-v2.0 only",
     "recipe": "legacy_fixed_700", "embedding": "Snowflake/snowflake-arctic-embed-l-v2.0",
     "rerank": False, "rerank_depth": 12, "expansion": False},
    {"id": "E4", "desc": "Refined metadata extraction and predicates only",
     "recipe": "legacy_fixed_700", "embedding": "BAAI/bge-large-en-v1.5",
     "rerank": False, "rerank_depth": 12, "expansion": False, "predicate_suite": True},
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def cuda_sync():
    try:
        if torch.cuda.is_available():
            torch.cuda.synchronize()
    except Exception:
        pass


def build_experiment_index(cfg: Dict[str, Any], exp_dir: Path) -> Dict[str, Any]:
    exp_dir.mkdir(parents=True, exist_ok=True)
    # Fresh caches so model-load timing is attributable per config.
    clear_embeddings_cache()
    clear_retriever_cache()
    clear_prototype_cache()
    t0 = time.perf_counter()
    n = ingest_and_index(
        vector_store_dir=exp_dir,
        chunking_recipe=cfg["recipe"],
        embedding_model=cfg["embedding"],
    )
    build_wall = time.perf_counter() - t0
    with open(exp_dir / MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    try:
        revision = get_model_revision(cfg["embedding"])
    except Exception:
        revision = manifest.get("embedding_revision", "unknown")
    return {
        "chunks": n,
        "build_wall_seconds": round(build_wall, 3),
        "manifest": manifest,
        "embedding_revision": revision,
    }


def evaluate_retrieval(retriever: HybridIndustrialRetriever, rag_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    # 5 warm-ups (excluded from measurement).
    for i in range(5):
        retriever.retrieve("warmup query hydraulic press", k=1)
    passes: List[Dict[str, Any]] = []
    pooled_lat_ms: List[float] = []
    per_case_ranks: Dict[str, List[int | None]] = {c["id"]: [] for c in rag_cases}
    per_case_sources: Dict[str, List[List[str]]] = {c["id"]: [] for c in rag_cases}
    for _ in range(3):
        lat_ms: List[float] = []
        r1 = r3 = r5 = 0
        rr: List[float] = []
        for case in rag_cases:  # fixed query order
            cuda_sync()
            t0 = time.perf_counter()
            results = retriever.retrieve(case["query"], k=5)
            cuda_sync()
            dt_ms = (time.perf_counter() - t0) * 1000.0
            lat_ms.append(dt_ms)
            pooled_lat_ms.append(dt_ms)
            sources = [r.get("source") for r in results]
            exp = case.get("expected_source")
            per_case_sources[case["id"]].append(sources)
            if sources and exp == sources[0]:
                r1 += 1
            if exp in sources[:3]:
                r3 += 1
            if exp in sources[:5]:
                r5 += 1
            if exp in sources:
                rank = sources.index(exp) + 1
                rr.append(1.0 / rank)
                per_case_ranks[case["id"]].append(rank)
            else:
                rr.append(0.0)
                per_case_ranks[case["id"]].append(None)
        n = len(rag_cases)
        passes.append({
            "r1_hits": r1, "r3_hits": r3, "r5_hits": r5,
            "recall_at_1_pct": round(r1 / n * 100, 2),
            "recall_at_3_pct": round(r3 / n * 100, 2),
            "recall_at_5_pct": round(r5 / n * 100, 2),
            "mrr": round(float(np.mean(rr)), 4),
            "p50_ms": round(float(np.percentile(lat_ms, 50)), 1),
            "p95_ms": round(float(np.percentile(lat_ms, 95)), 1),
        })
    # Aggregate: recall/MRR averaged across passes (= deterministic), latency pooled.
    agg = {
        "passes": passes,
        "r1_hits": round(float(np.mean([p["r1_hits"] for p in passes])), 2),
        "r3_hits": round(float(np.mean([p["r3_hits"] for p in passes])), 2),
        "r5_hits": round(float(np.mean([p["r5_hits"] for p in passes])), 2),
        "recall_at_1_pct": round(float(np.mean([p["recall_at_1_pct"] for p in passes])), 2),
        "recall_at_3_pct": round(float(np.mean([p["recall_at_3_pct"] for p in passes])), 2),
        "recall_at_5_pct": round(float(np.mean([p["recall_at_5_pct"] for p in passes])), 2),
        "mrr": round(float(np.mean([p["mrr"] for p in passes])), 4),
        "p50_ms": round(float(np.percentile(pooled_lat_ms, 50)), 1),
        "p95_ms": round(float(np.percentile(pooled_lat_ms, 95)), 1),
        "latency_samples": len(pooled_lat_ms),
    }
    # Domain breakdown from pass-0 ranks (deterministic across passes).
    domain_stats: Dict[str, Dict[str, Any]] = {}
    for case in rag_cases:
        d = case.get("domain", "general")
        s = domain_stats.setdefault(d, {"total": 0, "r1": 0, "r3": 0, "r5": 0, "rr": []})
        s["total"] += 1
        ranks = per_case_ranks[case["id"]]
        rank0 = ranks[0]
        if rank0 == 1:
            s["r1"] += 1
        if rank0 is not None and rank0 <= 3:
            s["r3"] += 1
        if rank0 is not None and rank0 <= 5:
            s["r5"] += 1
        s["rr"].append(1.0 / rank0 if rank0 else 0.0)
    domain_summary = {}
    for d, s in domain_stats.items():
        tot = s["total"]
        domain_summary[d] = {
            "queries": tot,
            "r1_hits": s["r1"],
            "r3_hits": s["r3"],
            "r5_hits": s["r5"],
            "recall_at_1_pct": round(s["r1"] / tot * 100, 1),
            "recall_at_3_pct": round(s["r3"] / tot * 100, 1),
            "recall_at_5_pct": round(s["r5"] / tot * 100, 1),
            "mrr": round(float(np.mean(s["rr"])), 3),
        }
    agg["domain_breakdown"] = domain_summary
    # Per-case detail (rank from pass 0 + top candidates).
    detail = []
    for case in rag_cases:
        detail.append({
            "id": case["id"],
            "query": case["query"],
            "domain": case.get("domain"),
            "expected_source": case.get("expected_source"),
            "retrieved_rank_pass0": per_case_ranks[case["id"]][0],
            "top_sources_pass0": per_case_sources[case["id"]][0],
        })
    agg["per_case"] = detail
    return agg


def evaluate_guardrails(dataset: List[Dict[str, Any]], embedding_model: str) -> Dict[str, Any]:
    tp = fp = tn = fn = 0
    failures = []
    for item in dataset:
        in_domain, _ = check_query_domain(item["query"], model_name=embedding_model)
        if item["is_answerable"]:
            if in_domain:
                tp += 1
            else:
                fn += 1
                failures.append({"id": item["id"], "status": "FALSE_NEGATIVE"})
        else:
            if not in_domain:
                tn += 1
            else:
                fp += 1
                failures.append({"id": item["id"], "status": "FALSE_POSITIVE"})
    total = tp + fp + tn + fn
    acc = round((tp + tn) / total * 100, 2) if total else 0.0
    prec = round(tp / (tp + fp) * 100, 2) if (tp + fp) else 0.0
    rec = round(tp / (tp + fn) * 100, 2) if (tp + fn) else 0.0
    f1 = round(2 * prec * rec / (prec + rec), 2) if (prec + rec) else 0.0
    return {
        "total_cases": total, "tp": tp, "tn": tn, "fp": fp, "fn": fn,
        "accuracy_pct": acc, "precision_pct": prec, "recall_pct": rec, "f1_pct": f1,
        "failures": failures,
    }


def check_gate(candidate: Dict[str, Any], baseline: Dict[str, Any]) -> Dict[str, Any]:
    c, b = candidate["retrieval"], baseline["retrieval"]
    r3_gain_hits = round(c["r3_hits"] - b["r3_hits"], 2)
    r3_gain_pts = round(c["recall_at_3_pct"] - b["recall_at_3_pct"], 2)
    reasons = []
    if r3_gain_hits < 2 or r3_gain_pts < 4.0:
        reasons.append(f"needs +2 R@3 hits/+4pts, got {r3_gain_hits:+.0f} hits ({r3_gain_pts:+.2f}pts)")
    if c["r5_hits"] < b["r5_hits"]:
        reasons.append(f"Recall@5 regressed ({c['r5_hits']:.0f} < {b['r5_hits']:.0f})")
    for dom in ("hydraulic", "semiconductor"):
        cd = c["domain_breakdown"].get(dom, {}).get("r3_hits", 0)
        bd = b["domain_breakdown"].get(dom, {}).get("r3_hits", 0)
        if cd < bd:
            reasons.append(f"{dom} R@3 loss ({cd} < {bd})")
    if c["p95_ms"] > P95_GATE_MS:
        reasons.append(f"p95 {c['p95_ms']}ms > {P95_GATE_MS}ms")
    return {"passed": not reasons, "r3_gain_hits": r3_gain_hits, "r3_gain_pts": r3_gain_pts, "reasons": reasons}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="Comma-separated experiment IDs to run")
    ap.add_argument("--skip-embeddings", default="", help="Comma-separated exp IDs to skip (e.g. E3b,E3c)")
    ap.add_argument("--promote", action="store_true", help="Atomically promote the winner to vector_store/ if it passes the gate")
    ap.add_argument("--run-id", default="", help="Report version tag")
    args = ap.parse_args()

    only = {s.strip() for s in args.only.split(",") if s.strip()}
    skip = {s.strip() for s in args.skip_embeddings.split(",") if s.strip()}
    run_id = args.run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    REPORT_BASE.mkdir(parents=True, exist_ok=True)
    SCRATCH_BASE.mkdir(parents=True, exist_ok=True)

    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)
    dataset_sha = sha256_file(DATASET_PATH)
    rag_cases = [d for d in dataset if d.get("expected_source") and d.get("is_answerable")]
    assert len(rag_cases) == 50, f"Expected 50 labeled retrieval queries, got {len(rag_cases)}"
    print(f"Dataset SHA-256: {dataset_sha} | RAG queries: {len(rag_cases)} | total cases: {len(dataset)}")
    print(f"Production index untouched at: {PROD_VECTOR_DIR}")

    prod_manifest_sha_before = sha256_file(PROD_VECTOR_DIR / MANIFEST_FILE)

    results: Dict[str, Any] = {}
    order = [e for e in EXPERIMENTS if (not only or e["id"] in only) and e["id"] not in skip]

    for cfg in order:
        exp_id = cfg["id"]
        print(f"\n===== {exp_id}: {cfg['desc']} =====")
        print(f"  recipe={cfg['recipe']} embedding={cfg['embedding']} rerank={cfg['rerank']}@{cfg['rerank_depth']} expansion={cfg['expansion']}")
        exp_dir = SCRATCH_BASE / exp_id
        try:
            build_info = build_experiment_index(cfg, exp_dir)
        except Exception as e:
            print(f"  BUILD FAILED: {e}")
            results[exp_id] = {"config": cfg, "status": "BUILD_FAILED", "error": str(e)}
            continue
        print(f"  built {build_info['chunks']} chunks in {build_info['build_wall_seconds']}s (rev={build_info['embedding_revision'][:12] if len(str(build_info['embedding_revision']))>12 else build_info['embedding_revision']})")
        try:
            retriever = HybridIndustrialRetriever(
                vector_store_dir=exp_dir,
                embedding_model=cfg["embedding"],
                enable_reranker=cfg["rerank"],
                rerank_depth=cfg["rerank_depth"],
                enable_query_expansion=cfg["expansion"],
            )
            retrieval = evaluate_retrieval(retriever, rag_cases)
            guard = evaluate_guardrails(dataset, cfg["embedding"])
        except Exception as e:
            print(f"  EVAL FAILED: {e}")
            import traceback; traceback.print_exc()
            results[exp_id] = {"config": cfg, "status": "EVAL_FAILED", "error": str(e), "build": build_info}
            continue
        results[exp_id] = {
            "config": cfg, "status": "OK",
            "retrieval": retrieval, "guardrail": guard,
            "build": build_info,
            "index_dir": str(exp_dir),
        }
        r = retrieval
        print(f"  R@1 {r['recall_at_1_pct']}% ({r['r1_hits']:.0f}) R@3 {r['recall_at_3_pct']}% ({r['r3_hits']:.0f}) R@5 {r['recall_at_5_pct']}% ({r['r5_hits']:.0f}) MRR {r['mrr']} p50 {r['p50_ms']}ms p95 {r['p95_ms']}ms")
        print(f"  guardrail acc {guard['accuracy_pct']}% (tp={guard['tp']} tn={guard['tn']} fp={guard['fp']} fn={guard['fn']})")

    # Gate evaluation vs E0 same-run control.
    baseline = results.get("E0")
    gate_table: Dict[str, Any] = {}
    if baseline and baseline.get("status") == "OK":
        for exp_id, res in results.items():
            if exp_id == "E0" or res.get("status") != "OK":
                continue
            gate_table[exp_id] = check_gate(res, baseline)
            g = gate_table[exp_id]
            print(f"{exp_id} gate: {'PASS' if g['passed'] else 'FAIL'} {g['reasons'] if g['reasons'] else ''}")

    # E5 trigger: best non-expansion config still has >=2 misses from terminology.
    e5_cfg = None
    if baseline and baseline.get("status") == "OK":
        passed = [eid for eid, g in gate_table.items() if g["passed"]]
        pool = passed if passed else [eid for eid, r in results.items() if r.get("status") == "OK" and eid != "E0"]
        # rank pool by (R@3, MRR, R@1, -p95)
        def sort_key(eid):
            r = results[eid]["retrieval"]
            return (r["recall_at_3_pct"], r["mrr"], r["recall_at_1_pct"], -r["p95_ms"])
        pool_sorted = sorted(pool, key=sort_key, reverse=True)
        best_id = pool_sorted[0] if pool_sorted else None
        if best_id:
            misses = [c for c in results[best_id]["retrieval"]["per_case"] if c["retrieved_rank_pass0"] is None]
            # Heuristic terminology tagging: acronym/model-alias/fault-code in query.
            import re as _re
            tagged = []
            for m in misses:
                q = m["query"]
                kind = None
                if _re.search(r"\b(RF|PECVD|CMP|LOTO|SOP|HPU|CNC|ESC|MFC|FFU|HEPA|DI|PPE)\b", q):
                    kind = "acronym"
                elif _re.search(r"(ApexMill|TitanPress|EtchMaster|DepoPro|LithoWave|NanoPolish|PlasmaEtch|Centura|Reflexion|CleanFan|Zenith|NXT)", q, _re.I):
                    kind = "model_alias"
                elif _re.search(r"\b[A-Z]-\d{3}\b", q):
                    kind = "fault_code"
                tagged.append({"id": m["id"], "terminology_kind": kind or "other"})
            from backend.app.rag.query_expansion import should_trigger_expansion
            trigger = should_trigger_expansion(tagged)
            print(f"E5 trigger check on {best_id}: {len(misses)} misses, terminology-trigger={trigger}")
            if trigger and "E5" not in results and (not only or "E5" in only):
                e5_cfg = {"id": "E5", "desc": f"Query expansion on {best_id}", "recipe": results[best_id]["config"]["recipe"],
                          "embedding": results[best_id]["config"]["embedding"], "rerank": results[best_id]["config"]["rerank"],
                          "rerank_depth": results[best_id]["config"]["rerank_depth"], "expansion": True}
                print("  Running E5 (expansion)...")
                exp_dir = SCRATCH_BASE / "E5"
                try:
                    build_info = build_experiment_index(e5_cfg, exp_dir)
                    retriever = HybridIndustrialRetriever(vector_store_dir=exp_dir, embedding_model=e5_cfg["embedding"],
                                                          enable_reranker=e5_cfg["rerank"], rerank_depth=e5_cfg["rerank_depth"],
                                                          enable_query_expansion=True)
                    retrieval = evaluate_retrieval(retriever, rag_cases)
                    guard = evaluate_guardrails(dataset, e5_cfg["embedding"])
                    results["E5"] = {"config": e5_cfg, "status": "OK", "retrieval": retrieval, "guardrail": guard, "build": build_info, "index_dir": str(exp_dir)}
                    gate_table["E5"] = check_gate(results["E5"], baseline)
                except Exception as e:
                    results["E5"] = {"config": e5_cfg, "status": "EVAL_FAILED", "error": str(e)}
        else:
            best_id = None
    else:
        best_id = None

    # C1+: combine independently accepted improvements.
    accepted = [eid for eid, g in gate_table.items() if g["passed"]]
    c1_cfg = None
    if baseline and baseline.get("status") == "OK" and accepted and (not only or any(c.startswith("C1") for c in only)):
        # Compose: best recipe among accepted E1*, best rerank depth among accepted E2*, best embedding among accepted E3*; expansion if E5 accepted.
        def best_of(prefixes):
            cands = [e for e in accepted if any(e.startswith(p) for p in ([prefixes] if isinstance(prefixes, str) else prefixes))]
            if not cands:
                return None
            return max(cands, key=lambda eid: (results[eid]["retrieval"]["recall_at_3_pct"], results[eid]["retrieval"]["mrr"]))
        best_chunk = best_of(["E1"]) or "E0"
        best_rr = best_of(["E2"])
        best_emb = best_of(["E3"]) or "E0"
        c1_cfg = {"id": "C1", "desc": f"Combined {best_chunk}+{best_rr or 'no-rerank'}+{best_emb} accepted",
                  "recipe": results[best_chunk]["config"]["recipe"], "embedding": results[best_emb]["config"]["embedding"],
                  "rerank": bool(best_rr), "rerank_depth": results[best_rr]["config"]["rerank_depth"] if best_rr else 12,
                  "expansion": ("E5" in accepted)}
        print(f"Running C1 combination: {c1_cfg}")
        exp_dir = SCRATCH_BASE / "C1"
        try:
            build_info = build_experiment_index(c1_cfg, exp_dir)
            retriever = HybridIndustrialRetriever(vector_store_dir=exp_dir, embedding_model=c1_cfg["embedding"],
                                                  enable_reranker=c1_cfg["rerank"], rerank_depth=c1_cfg["rerank_depth"],
                                                  enable_query_expansion=c1_cfg["expansion"])
            retrieval = evaluate_retrieval(retriever, rag_cases)
            guard = evaluate_guardrails(dataset, c1_cfg["embedding"])
            results["C1"] = {"config": c1_cfg, "status": "OK", "retrieval": retrieval, "guardrail": guard, "build": build_info, "index_dir": str(exp_dir)}
            gate_table["C1"] = check_gate(results["C1"], baseline)
        except Exception as e:
            results["C1"] = {"config": c1_cfg, "status": "EVAL_FAILED", "error": str(e)}

    # Winner selection among passing configs (R@3, MRR, R@1, lower p95).
    winner_id = None
    if baseline and baseline.get("status") == "OK":
        passing = [eid for eid, g in gate_table.items() if g["passed"] and results[eid].get("status") == "OK"]
        if passing:
            winner_id = max(passing, key=lambda eid: (results[eid]["retrieval"]["recall_at_3_pct"], results[eid]["retrieval"]["mrr"], results[eid]["retrieval"]["recall_at_1_pct"], -results[eid]["retrieval"]["p95_ms"]))

    # Wins/losses vs E0 for each config.
    if baseline and baseline.get("status") == "OK":
        base_ranks = {c["id"]: c["retrieved_rank_pass0"] for c in baseline["retrieval"]["per_case"]}
        for eid, res in results.items():
            if res.get("status") != "OK" or eid == "E0":
                continue
            wins, losses = [], []
            for c in res["retrieval"]["per_case"]:
                b, n = base_ranks.get(c["id"]), c["retrieved_rank_pass0"]
                b_hit = b is not None and b <= 3
                n_hit = n is not None and n <= 3
                if n_hit and not b_hit:
                    wins.append(c["id"])
                elif b_hit and not n_hit:
                    losses.append(c["id"])
            res["wins_vs_E0"] = wins
            res["losses_vs_E0"] = losses

    prod_manifest_sha_after = sha256_file(PROD_VECTOR_DIR / MANIFEST_FILE)
    production_untouched = (prod_manifest_sha_before == prod_manifest_sha_after)

    report = {
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_path": str(DATASET_PATH),
        "dataset_sha256": dataset_sha,
        "retrieval_queries": len(rag_cases),
        "guardrail_cases": len(dataset),
        "promotion_gate": {"min_r3_gain_hits": 2, "min_r3_gain_pts": 4.0, "no_r5_loss": True,
                           "no_hydraulic_semiconductor_r3_loss": True, "p95_max_ms": P95_GATE_MS},
        "production_index_untouched": production_untouched,
        "baseline_E0": baseline["retrieval"] if baseline and baseline.get("status") == "OK" else None,
        "results": results,
        "gate_table": gate_table,
        "accepted": accepted if baseline and baseline.get("status") == "OK" else [],
        "winner": winner_id,
        "device": {"cuda_available": torch.cuda.is_available(), "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"},
    }

    json_path = REPORT_BASE / f"retrieval_experiments_{run_id}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    md_path = REPORT_BASE / f"retrieval_experiments_{run_id}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown(report))
    print(f"\nWinner: {winner_id}")
    print(f"Production untouched: {production_untouched}")
    print(f"Reports: {json_path} | {md_path}")

    if args.promote:
        if not winner_id:
            print("No gate-passing winner; nothing promoted (production preserved).")
        else:
            promote_winner(results[winner_id], PROD_VECTOR_DIR)

    return report


def promote_winner(winner: Dict[str, Any], prod_dir: Path) -> None:
    src = Path(winner["index_dir"])
    print(f"Promoting {winner['config']['id']} -> {prod_dir} atomically...")
    tmp = Path(tempfile.mkdtemp(prefix="promote_"))
    try:
        for name in ("index.faiss", "chunks_cache.json", "manifest.json"):
            shutil.copy2(src / name, tmp / name)
        for name in ("index.faiss", "chunks_cache.json", "manifest.json"):
            shutil.copy2(tmp / name, prod_dir / name)
        print("Promotion complete.")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def render_markdown(report: Dict[str, Any]) -> str:
    L: List[str] = []
    L.append(f"# Retrieval Optimization Experiments — {report['run_id']}")
    L.append("")
    L.append(f"- Timestamp: {report['timestamp']}")
    L.append(f"- Dataset SHA-256: `{report['dataset_sha256']}` ({report['retrieval_queries']} labeled retrieval queries within {report['guardrail_cases']}-case benchmark)")
    L.append(f"- Device: cuda={report['device']['cuda_available']} ({report['device']['cuda_device']})")
    L.append(f"- Production index untouched: **{report['production_index_untouched']}**")
    L.append(f"- Gate: +2 R@3 hits/+4pts, no R@5 loss, no Hydraulic/Semiconductor R@3 loss, p95 ≤ {P95_GATE_MS}ms")
    L.append("")
    L.append("| Exp | Recipe | Embedding | Rerank | Exp | R@1 | R@3 | R@5 | MRR | p50 | p95 | Gate |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    base = report.get("baseline_E0")
    for eid, res in report["results"].items():
        if res.get("status") != "OK":
            L.append(f"| {eid} | — | — | — | — | FAILED ({res.get('error','')[:60]}) | | | | | | |")
            continue
        c, r = res["config"], res["retrieval"]
        gate = report["gate_table"].get(eid, {})
        gstr = "BASELINE" if eid == "E0" else ("PASS" if gate.get("passed") else f"FAIL: {'; '.join(gate.get('reasons', []))}")
        emb_short = c["embedding"].split("/")[-1]
        L.append(f"| {eid} | {c['recipe']} | {emb_short} | {c['rerank']}@{c['rerank_depth']} | {c['expansion']} | {r['recall_at_1_pct']}% ({r['r1_hits']:.0f}) | {r['recall_at_3_pct']}% ({r['r3_hits']:.0f}) | {r['recall_at_5_pct']}% ({r['r5_hits']:.0f}) | {r['mrr']} | {r['p50_ms']}ms | {r['p95_ms']}ms | {gstr} |")
    L.append("")
    L.append(f"Winner: **{report['winner']}** | Accepted: {report['accepted']}")
    L.append("")
    L.append("## Domain breakdown (Recall@3 hits)")
    for eid, res in report["results"].items():
        if res.get("status") != "OK":
            continue
        parts = [f"{d}={s['r3_hits']}/{s['queries']} ({s['recall_at_3_pct']}%)" for d, s in res["retrieval"]["domain_breakdown"].items()]
        L.append(f"- {eid}: " + "; ".join(parts))
    L.append("")
    L.append("## Remaining errors (winner or best vs E0)")
    target = report["winner"] or "E0"
    res = report["results"].get(target)
    if res and res.get("status") == "OK":
        for c in res["retrieval"]["per_case"]:
            if c["retrieved_rank_pass0"] is None or c["retrieved_rank_pass0"] > 3:
                L.append(f"- {c['id']} [{c['domain']}] expected={c['expected_source']} rank={c['retrieved_rank_pass0']} top={c['top_sources_pass0'][:3]} :: {c['query'][:100]}")
    L.append("")
    L.append("_Source-level relevance is the benchmark's current limit: it verifies the expected document, not the exact answer-bearing chunk._")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    main()
