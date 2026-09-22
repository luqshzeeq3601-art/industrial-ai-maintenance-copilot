# ADR-001: Split IndustrialRepository god object

Status: Accepted. Date: 2026-09-18.
Context: `IndustrialRepository` 48 edges, betweenness 0.093, bridging 10 communities.
Decision: `BaseRepository` + 7 focused repos (`equipment, alarm, fault_code, work_order, inspection, user/audit/telemetry`), keep `IndustrialRepository` facade for compat, migrate callers (`main.py`, `api/v1/*`, `services/*`, `tools/*`, `agents/approval.py`, `agents/diagnostic_agent.py`) to sub-repos.
Consequences: Facade edges temporarily 57 (delegation), then drops as callers migrate. Tests: `test_auth_and_approval + test_telemetry + test_api_contract` 18 passed.
