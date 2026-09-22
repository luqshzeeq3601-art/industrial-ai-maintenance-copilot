# Phase 3 - Production Hardening (Weeks 7-12, probation exit)

## 3.1 Decompose Low-Cohesion Modules
- `Community 0` cohesion 0.06: split `EquipmentService`, `action_tools`, `schemas.py` - move state-changing tools to `backend/app/tools/actions/` with explicit HITL annotations.
- `check_query_domain()` (`backend/app/guardrails/abstention.py:L78`, 21 edges, bridges `Community 17` to `0,65,6,9,15,24`): split domain classifier vs prompt-injection guard vs evidence evaluator (`evaluate_evidence()`).
- Re-run `graphify cluster-only .` - target: no community cohesion <0.10 (except generated `compilerOptions`).

## 3.2 Dual DB Live Verification
Current: `SqliteSaver` / `PostgresSaver` in `backend/app/agents/graph.py:L45`, `get_checkpointer()`, `get_graph()`, but `test_persistence.py:L71-L72` only mocks Postgres config.

Plan:
- `docker-compose --profile postgres up`, run `python scripts/migrate_sqlite_to_postgres.py --verify-counts`, `python scripts/seed_db.py`.
- Add live Postgres job in CI (service `postgres:16-alpine`), run `test_persistence.py`, `test_auth_and_approval.py` against it.
- Alembic: `backend/app/database/alembic/` offline/online migrations (`run_migrations_offline()`, `run_migrations_online()` in `Community 1`) tested both modes.

## 3.3 Observability + Safety
- Prometheus: `backend/app/telemetry/metrics.py`, `prometheus_metrics()` (`Community 48`), `TokenUsageCallbackHandler` (`Community 66`).
- Add alert rules in `docker/prometheus/prometheus.yml`: abstention spike, RAG p95 >300ms, `cost-per-1k` anomaly, MQTT lag (`MQTTTelemetrySubscriber`, `Community 3`).
- Add Grafana dashboards for fleet health (`fleet_health_analytics()`, `fault_category_analytics()` in `backend/app/main.py`), link `ActionApprovalCard` latency.
- Keep strict HITL isolation: `test_telemetry_strict_hitl_isolation()` (`Community 3`) must stay green - telemetry creates alarms only, never auto work orders.

## 3.4 Azure + K8s
- Add `AzureAISearchRetriever` behind `VECTOR_BACKEND=azure_search`, add Document Intelligence loader in `rag/ingest.py:load_documents()`.
- Harden `deploy/k8s/base/` + `overlays/gpu/`: resource limits for `ollama`, `backend`, `PostgresSaver` pool (`max_size=20`), Ingress TLS, `SECRET` via ExternalSecrets.
- Frontend `nginx.conf`, `Dockerfile` readiness probes to match backend `healthcheck` (`docker-compose.yml:37`).

## Exit Checklist
- [ ] No god node >25 edges, no community <0.10 cohesion (excluding tsconfig)
- [ ] Isolated nodes <20, contract test green
- [ ] 0 secrets in repo, live Postgres CI green
- [ ] Recall@5 >=90%, guardrail >=95%, RAG p95 <300ms
- [ ] Demo: `docker-compose --profile all up` -> REST/MQTT telemetry -> RAG diagnosis -> supervisor approve (`api/v1/actions.py`) -> `action_audit` trail with token/cost metrics
