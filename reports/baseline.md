# Baseline Freeze - 2026-09-18

Commit: `9181c8d552266f8b0dba8ada1fbe41207b3a78c0`
Graph: 851 nodes, 1515 edges, 68 communities. Health OK - 0 missing/dangling/collapsed.
Build: code-only (109 code, 44 non-code skipped, 1 sensitive `secrets.yaml`).

## Tests
- `backend/tests/test_auth_and_approval.py + test_telemetry.py`: 13 passed (venv, 50s)
- Full suite target: 58 tests (see README badge)
- Strict HITL isolation: `test_telemetry_strict_hitl_isolation` must stay green

## Retrieval / Guardrail (README claims)
- Guardrail accuracy 97.0% (97/100), abstention precision 94.3%, recall 100%, F1 97.1%
- RAG Recall@3 80%, Recall@5 90%, MRR 0.751, p50 158.4ms p95 181.8ms
- Cost: Ollama $0 vs Azure GPT-4o-mini $74.50/10k queries

## God Nodes (pre-refactor)
- `IndustrialRepository` 48 edges (`backend/app/database/repository.py:L8`)
- `EquipmentService` 21, `check_query_domain()` 21, `HybridIndustrialRetriever` 19

## Gaps frozen
- Community 0 cohesion 0.06, 104 isolated nodes, 2 INFERRED eval edges
- Secrets: `docker-compose.yml:108` hardcoded, `secrets.yaml` skipped
- Vector: FAISS only, no Milvus/Pinecone abstraction
- Docs: `docs/` empty at plan time, `data/manuals/ + sops/` unchecked in graph
