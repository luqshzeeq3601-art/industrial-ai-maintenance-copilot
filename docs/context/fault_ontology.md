# Fault Ontology (maps `fault_codes` table -> RAG filters)

Categories (`fault_codes.category`): electrical, mechanical, hydraulic, pneumatic, software.
Severity: low, medium, high, critical.

Examples (see `backend/app/database/migrations.py` seed + `data/manuals/`):
- `E-402` / `E402` / `E 402` variants normalized by `normalize_predicate_value()` + `generate_query_variants()` (`backend/app/rag/query_expansion.py`).
- Hydraulic pressure drop -> hydraulic/high, TitanPress-3000.
- RF matchbox failure EQ-2001 -> semiconductor/critical.

Retrieval: explicit `fault_code_filter` is strict; inferred IDs use filter-first + backfill so sparse metadata never returns empty (`retriever.py:retrieve`).
