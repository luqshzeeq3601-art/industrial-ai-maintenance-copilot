# Master Fix Plan - All-Aspects Hardening (2026-09-18)

Source: full audit - graph 959+ nodes/1692 edges, 81 tests (fast 18 green, full >120s timeout),
49 modified + 30 untracked vs `9181c8d5`, god `IndustrialRepository 41`, `BaseRepository 20`.

## P0 - Must fix before hire demo
1. **Git hygiene**: gitignore `vector_store/*.faiss`, `*.db*`, `graphify-out/` runtime; commit in slices
   (db-split, guardrail-split, vector, secrets, eval-harness, docs). Files: `.gitignore`, `future work/`.
2. **Security**: startup guard `JWT_SECRET>=32` + reject defaults in prod (`ENV=production`);
   `TELEMETRY_HMAC_REQUIRED` default True when `ENV=production`; cookies `secure=True` when prod.
   Files: `backend/app/config.py`, `backend/app/auth/router.py:43`.
3. **Backend**: extract `api/compat.py` from `main.py:301`; paginate `telemetry/events`
   (already limit<=500, add total); replace raw SQL in `actions.py:22`, `user_cli.py:44`
   with `Audit/User` repos. Add SQLite indexes in `models.py` SCHEMA_SQL.
4. **Tests speed**: `pyproject.toml` pytest markers `slow, integration`; mark embedding/guardrail
   tests `@pytest.mark.slow`; CI fast job excludes slow; document `HF_HUB_CACHE`.

## P1 - Should fix for 7k band
5. **RAG**: wire `FaissStore` into `retriever.py` dense path; add deprecation shim
   `langchain_huggingface` preferred, fallback `langchain_community` (no new hard dep).
6. **Agents**: log checkpointer fallback (`graph.py:32`), add `action_id UNIQUE` guard note,
   document supervisor routing (START->supervisor + Command goto) in `docs/adr/`.
7. **Frontend**: `VITE_API_URL` env (fallback localhost), `npm run openapi` script,
   error boundary + SSE reconnect note. Files: `frontend/src/App.tsx:13`, `package.json`.
8. **DevOps/docs**: CI matrix (fast backend, frontend build, kustomize build),
   README badge 58->81, `docs/runbooks/edge-deploy.md` (Batu Kawan IPC offline).

## Acceptance
- `pytest -m "not slow"` <60s green; full suite documents slow reason (HF 391 weights).
- `graphify god-nodes` top <=41, no new god >25.
- no hardcoded PostgreSQL credentials; prod startup rejects default secrets.
- `VITE_API_URL` works; `npm run build` green in CI.
