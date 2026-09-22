# Ingestion Runbook (ME/EE -> vector_store)

1. Drop OEM PDF/MD into `data/manuals/` or SOP into `data/sops/`.
2. Run: `python -m backend.app.rag.ingest`
   - `load_documents()` -> `chunk_documents()` (recipe `CHUNKING_RECIPE`)
   - `build_chunk_metadata()` attaches `doc_type, machine_ids, fault_codes, equipment_domain`
   - `ingest_and_index()` writes FAISS index + `chunks_cache.json` + SHA-256 `manifest`
3. Verify: `python scripts/evaluate_ci.py`, check `reports/benchmark_report.md` Recall@5 >=90%.
4. Paths: `DOCS_DIR=/app/data` (`docker-compose.yml:31`), `VECTOR_STORE_DIR=/app/vector_store`.
5. Production rebuild uses production defaults only (`retriever.py:_initialize` guard).
6. To trial Milvus: `VECTOR_BACKEND=milvus python scripts/run_retrieval_experiments.py`.
