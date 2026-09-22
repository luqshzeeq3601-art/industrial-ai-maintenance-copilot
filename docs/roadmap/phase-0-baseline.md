# Phase 0 - Baseline (2 days)

## Goals
Freeze current behavior before refactoring so improvements are measurable.

## Tasks
1. Re-run full graphify including docs:
   ```bash
   graphify extract . --out .
   graphify cluster-only . --no-label
   ```
   Current code-only baseline: 851 nodes, 1515 edges, 68 communities. Full run should index `data/manuals/`, `data/sops/`, `README.md` (39 docs skipped in code-only).

2. Freeze metrics:
   ```bash
   pytest backend/tests/ -q
   python scripts/evaluate_extended.py
   python scripts/run_retrieval_experiments.py
   ```
   Record: Recall@3 80% / Recall@5 90%, guardrail 97% (97/100), abstention F1 97.1%, RAG p50 158ms p95 181.8ms, cost $0 Ollama vs $74.5/10k Azure.

3. Save `graphify-out/GRAPH_REPORT.md` + `graph.json` as CI artifact.

## Acceptance
- [ ] Baseline metrics recorded in `reports/baseline.md`
- [ ] `graphify diagnose multigraph` shows 0 missing/dangling/collapsed
- [ ] `git rev-parse HEAD` matches Graph Freshness commit `9181c8d5` or updated
