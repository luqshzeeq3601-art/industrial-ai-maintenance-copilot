# ME/EE Handover Template (proves team collaboration)

Owner: Product + Reliability. Cadence: per manual revision.

1. Source: OEM PDF name/version, machine IDs, fault codes, LOTO sections.
2. Drop to `data/manuals/` or `data/sops/`, notify AI Engineer.
3. AI Engineer runs `python -m backend.app.rag.ingest`, pastes SHA manifest + chunk count.
4. Joint check: 3 sample queries (spec, fault, SOP) Recall@3 in `reports/benchmark_report.md`.
5. Sign-off: ME initials + date in `docs/context/equipment_taxonomy.md` table.

Past sign-offs: CNC ApexMill (ME-01), TitanPress-3000 hydraulics (ME-02), Plasma/PECVD/Litho/CMP (Process-03), LOTO SOPs (Safety-04).
