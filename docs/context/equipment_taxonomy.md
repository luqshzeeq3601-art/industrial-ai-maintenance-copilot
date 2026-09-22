# Equipment Taxonomy (for RAG metadata `equipment_domain`, `machine_ids`, `equipment_models`)

Source docs: `data/manuals/*.md`, `data/sops/*.md`. Ingestion: `python -m backend.app.rag.ingest`.

| Domain | Models / IDs | Manuals |
|---|---|---|
| Mechanical CNC | ApexMill CNC, EQ-1xxx | `cnc_lathe_manual.md` |
| Hydraulic | TitanPress-3000, EQ-2xxx | `hydraulic_press_manual.md` |
| Semiconductor Plasma Etch | EQ-2001 RF matchbox | `semiconductor_*_manual.md` |
| Semiconductor PECVD | vacuum leak, RF generator | `semiconductor_pecvd_deposition_manual.md` |
| Semiconductor Lithography | scanner interferometer | `semiconductor_lithography_scanner_manual.md` |
| Semiconductor CMP | slurry polish | `semiconductor_cmp_polisher_manual.md` |
| Thermal | Spindle chiller | thermal sections in CNC manual |
| Pneumatic | Air handling | pneumatic sections |

Metadata extraction: `backend/app/rag/metadata.py:build_chunk_metadata`, `extract_machine_ids`, `extract_fault_codes`, `classify_domain`.
Chunking recipe E1b: `semantic_blocks_320_450_48` (`CHUNKING_RECIPE` in `config.py`).
