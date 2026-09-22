# Phase 1 - Critical Hire Blockers (Weeks 1-2)

## 1.1 Split God `IndustrialRepository` (48 edges, betweenness 0.093)

File: `backend/app/database/repository.py` (518 lines, `IndustrialRepository:L8`)

Current: single class touches `Community 5,0,3,10,14,16,20,23,24,25,29` - equipment, alarms, work orders, inspections, users, audit.

Plan:
- Add `backend/app/database/base.py`: `BaseRepository(_get_conn)` extracted from `IndustrialRepository._get_conn:L12`.
- Add `EquipmentRepository`, `AlarmRepository`, `WorkOrderRepository`, `InspectionRepository`, `AuditRepository`, `UserRepository` - move methods per section (`# --- Equipment ---`, `# --- Alarms ---`, etc.).
- Keep `IndustrialRepository` as facade composing sub-repos for backward compat (`backend/app/main.py:31`, `backend/app/api/v1/*`, `backend/app/services/*`).
- Update `backend/app/services/equipment_service.py:L7` to depend on `EquipmentRepository` only, not full facade.
- Split `Community 0` (cohesion 0.06): move HITL tools `acknowledge_alarm()`, `create_work_order()` from `EquipmentService` to `backend/app/tools/actions/`.

Acceptance:
- [ ] `graphify god-nodes` max <25 edges
- [ ] `Community 5` cohesion >0.3
- [ ] `pytest backend/tests/test_auth_and_approval.py backend/tests/test_telemetry.py -q` green

## 1.2 Frontend-Backend Contract (104 isolated nodes)

Isolated: `Citation`, `Stats`, `WorkOrderLog`, `AgentWorkflowDagProps` (`frontend/src/components/visualization/AgentWorkflowDag.tsx:L4`), `FaultCategoriesData`, `FleetHealthDonut`, `ActionApprovalCardProps`.

Backend source: `ChatResponse` (`backend/app/main.py:L129`), SSE `approval_required` (`backend/app/main.py:226`), `WorkflowStep`.

Plan:
- Export OpenAPI: run backend, `curl localhost:8000/openapi.json > openapi.json`, generate `frontend/src/api/types.ts` via `openapi-typescript`.
- Align `PendingActionPayload` with `pending_action` dict (`backend/app/agents/approval.py`), align `Citation` with `citations` in `ChatResponse`.
- Add `backend/tests/test_api_contract.py`: assert `/api/chat`, `/api/chat/stream`, `/api/v1/actions/{id}/approve` response shapes match frontend types.
- Delete dead props or wire `App.tsx:L1`, `components/*` to real endpoints.

Acceptance:
- [ ] Isolated nodes <20 in next `GRAPH_REPORT.md`
- [ ] Contract test green in CI

## 1.3 Secrets Management (`secrets.yaml` skipped + hardcoded passwords)

Evidence: the earlier baseline contained hardcoded development credentials in Compose; the current configuration requires these values from `.env` instead.

Plan:
- Replace with `${POSTGRES_PASSWORD:?}`, `${GF_SECURITY_ADMIN_PASSWORD:?}` + document in `.env.example`.
- Add config provider in `backend/app/config.py` supporting env -> Azure KeyVault fallback.
- Add `gitleaks` / `detect-secrets` pre-commit, convert K8s `Secret` in `deploy/k8s/base/` to `SealedSecret` / ExternalSecrets.
- Rotate any committed credential.

Acceptance:
- [ ] repository scan finds no hardcoded PostgreSQL credentials
- [ ] `graphify extract` shows 0 sensitive skips (after allow-listing correctly)
