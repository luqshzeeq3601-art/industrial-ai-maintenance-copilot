# Roadmap Index (replaces loose `future work/` folder - no spaces in paths)

All plans live under `docs/roadmap/`. Start here.

| Order | File | Scope | Status |
|---|---|---|---|
| 0 | [phase-0-baseline.md](phase-0-baseline.md) | Freeze metrics, graph 851 nodes baseline | Done |
| 1 | [phase-1-critical-fixes.md](phase-1-critical-fixes.md) | Repo split, contract, secrets | Done |
| 2 | [phase-2-jd-alignment.md](phase-2-jd-alignment.md) | Milvus abstraction, docs, harness | Done |
| 3 | [phase-3-production-hardening.md](phase-3-production-hardening.md) | Cohesion, Postgres live, alerts, Azure | Done |
| 4 | [master-fix-plan.md](master-fix-plan.md) | All-aspects hardening (git, security, backend, tests, RAG, agents, frontend, CI) | Done |
| 5 | [perf-fix-plan.md](perf-fix-plan.md) | R@1 trial (reranker rejected: +6.9pts but p95 244->1118ms), latency -27ms, checkpoints, seed, LLM timeout | Done |

Current truth: `reports/README.md` + `scripts/evaluate_ci.py` (50/50 guardrail 100%, R@3/5 100%, p50 176ms p95 217ms).
