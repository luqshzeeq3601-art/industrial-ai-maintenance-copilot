# Edge Deploy Runbook - Batu Kawan Plant IPC (offline-capable)

Target: Intel i7 / RTX 3070 8GB, Ubuntu 22.04, Docker Compose, no cloud dependency.

1. `cp .env.example .env` - set `POSTGRES_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `JWT_SECRET>=32`, `TELEMETRY_HMAC_SECRET`, `TELEMETRY_HMAC_REQUIRED=true`.
2. `ollama pull qwen2.5:7b` (GPU), `python -m backend.app.rag.ingest` (bge-large, CPU fallback ok).
3. `docker-compose up -d backend frontend` (profiles: add `--profile postgres --profile observability --profile mqtt` as needed).
4. Verify: `curl localhost:8000/health`, `curl localhost:8000/api/stats`, `pytest -m "not slow" -q`.
5. Telemetry: `python scripts/simulate_telemetry.py --transport rest --scenario mechanical --rate 2.0`.
6. HITL demo: tech creates WO -> SSE `approval_required` -> supervisor `POST /api/v1/actions/{id}/approve`.
7. Offline: `VECTOR_BACKEND=faiss`, `LLM_PROVIDER=ollama`, cost $0. Cloud burst: `LLM_PROVIDER=azure_openai` + KeyVault env.
