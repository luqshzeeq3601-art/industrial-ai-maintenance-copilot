# Perf Fix Plan (from 2026-09-18 scorecard)

Baseline today: guardrail 50/50 100%, R@1 55.2% R@3/5 100% MRR 0.764,
p50 191.9ms p95 244.4ms (gate 275ms), fast tests 15/15 in 6.9s, full suite >120s,
checkpoints.db 6.7MB vs maintenance.db 0.48MB, seed FK fail, LLM path unmeasured.

1. Top-1: `ENABLE_RERANKER=true RERANKER_CANDIDATE_DEPTH=8 python scripts/evaluate_ci.py`
   - keep if R@1 up and p95 <=275ms, else depth 8 -> off. No prod default flip until gate passes.
2. Latency: single L2-normalize (FaissStore only), candidate floor 15->8 for <500 chunks,
   per-request query-embedding cache. Files: `rag/vector_base.py`, `rag/retriever.py`.
3. Tests: `HF_HUB_CACHE` persistent, embedding tests serial, `-m not slow` PR gate (done),
   nightly slow. Files: `.github/workflows/ci.yml`, `docs/runbooks/edge-deploy.md`.
4. Checkpoints: thread TTL cleanup script + VACUUM + cap `workflow_trace` to 50 steps.
   Files: `scripts/prune_checkpoints.py`, `agents/state.py`.
5. Seed/DB: delete order children-first in `scripts/seed_db.py:77`, remove 0B
   `data/industrial_maintenance.db` placeholder, document real paths.
6. LLM: `request_timeout=30, max_retries=1` in `llm/factory.py`, observe
   `LLM_INFERENCE_DURATION_SECONDS`, Azure fallback note. No behavior change by default.

Accept: R@1 up or documented, p95 <=275ms, fast tests <60s, checkpoints documented, seed runs.
