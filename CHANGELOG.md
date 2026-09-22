# Changelog

All notable changes, newest first. Format: Keep a Changelog.

## [Unreleased]
- Split `IndustrialRepository` god object into `BaseRepository` + 7 focused repos, facade kept; callers migrated (`main`, `api/v1`, `services`, `tools`, `agents`).
- Split guardrails `abstention.py` into `domain.py` / `injection.py` / `evidence.py` + facade.
- Added `VectorStore` abstraction (`FaissStore`, `MilvusStore`, `AzureAISearchRetriever` stub) + `VECTOR_BACKEND` switch.
- Added `eval/harness.py`, `test_api_contract.py`, `frontend/src/api/types.ts` contract.
- Security: prod secret guard, `${...:?}` compose secrets, K8s TLS + ExternalSecrets template, secure cookies in prod.
- Backend: extracted `api/compat.py`, added DB indexes, removed raw SQL from actions/CLI.
- Tests: `slow` markers, fast gate `-m not slow`, nightly slow job with HF cache.
- Perf: single-normalize FAISS path, adaptive candidate floor; reranker trialed then rejected (R@1 +6.9pts but p95 244->1118ms).
- LLM: `LLM_REQUEST_TIMEOUT_S=30`, `MAX_RETRIES=1`, inference latency observed.
- Docs: `docs/` Diataxis map, ADRs, context taxonomy, runbooks, roadmap index, API reference.

## [0.1.0] - 2026-09-17
- Initial multi-agent copilot: LangGraph supervisor + 3 specialists + approval `interrupt()`, hybrid FAISS+BM25 RRF, RBAC, HMAC/MQTT telemetry, dual DB, Prometheus/OTel, Docker + K8s.
