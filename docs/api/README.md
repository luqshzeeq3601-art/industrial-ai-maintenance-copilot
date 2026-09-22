# API Reference (generated, do not hand-edit)

Source: `backend/app/main.py` + `backend/app/api/v1/*` + `backend/app/api/compat.py`.

- `openapi.json` - generated via `.venv/Scripts/python.exe -c "from backend.app.main import app; import json; json.dump(app.openapi(), open('docs/api/openapi.json','w'), indent=2)"`
- Frontend contract: `frontend/src/api/types.ts` mirrors `ChatResponse`, `PendingActionPayload`, `PendingActionsResponse`, `ApproveActionResponse`. Regenerate check: `npm run openapi` (frontend) then diff types.
- Contract test: `backend/tests/test_api_contract.py` asserts `/api/chat` validation, `/api/v1/actions/*`, `/health` shapes.

Key flows:
1. `POST /api/chat` -> LangGraph invoke (may return `approval_required` + `pending_action`).
2. `POST /api/chat/stream` -> SSE `session_init, token, agent_start, tool_start/end, approval_required, done`.
3. `GET /api/v1/actions/pending` (supervisor) -> `POST /api/v1/actions/{id}/approve|reject` resumes thread via `Command(resume=...)`.
