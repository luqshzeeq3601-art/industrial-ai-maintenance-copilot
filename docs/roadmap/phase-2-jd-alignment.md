# Phase 2 - JD Alignment for UB OneLine (Weeks 3-6)

Target role: AI Engineer (Industrial AI Platform), Batu Kawan, 5-7k MYR.
Must close Advantage gaps without breaking FAISS baseline.

## 2.1 VectorDB Abstraction (FAISS only -> FAISS + Milvus)

Current: `HybridIndustrialRetriever` (`backend/app/rag/retriever.py:L59`), `ingest_and_index()` (`backend/app/rag/ingest.py:L92`), `get_retriever()` (`backend/app/rag/retriever.py:L360`).

Plan:
- Add `backend/app/rag/vector_base.py`: `VectorStore` interface `search(query_emb, k)`, `upsert(embeddings, payloads)`, `ntotal`.
- Refactor existing FAISS (`faiss.read_index`) + `BM25Okapi` + RRF `k=60` into `FaissStore(VectorStore)`.
- Add `MilvusStore(VectorStore)` using `pymilvus-lite` (local) with same interface, reuse `metadata.py:build_chunk_metadata:L117`, `normalize_predicate_value:L150`.
- Add `VECTOR_BACKEND=faiss|milvus` in `backend/app/config.py` + `docker-compose.yml` env, factory in `get_retriever()`.
- Extend `scripts/run_retrieval_experiments.py` + `scripts/evaluate.py` to benchmark both backends (fixes INFERRED edges `evaluate_retrieval_configuration() --uses--> HybridIndustrialRetriever`).

Acceptance:
- [ ] `VECTOR_BACKEND=milvus pytest backend/tests/test_retrieval*.py -q` green
- [ ] Eval report shows FAISS vs Milvus Recall@3/MRR/latency delta

## 2.2 Knowledge Engineering (`docs/` empty)

Plan:
- Add `docs/context/equipment_taxonomy.md` (CNC, TitanPress-3000, plasma/PECVD/litho/CMP, LOTO), `fault_ontology.md` (fault codes -> category/severity), `ingestion_runbook.md` (how ME/EE hand over PDFs -> `data/manuals/` -> `ingest_and_index` -> SHA manifest).
- Wire `DOCS_DIR=/app/data` (`docker-compose.yml:31`) + `VECTOR_STORE_DIR` manifest check (`retriever.py:_initialize`) into runbook.
- Add `make ingest` / `python -m backend.app.rag.ingest` smoke check.

Acceptance:
- [ ] New hire can ingest from docs alone
- [ ] `data/manuals/`, `data/sops/` checksums documented

## 2.3 Eval Harness Coupling (INFERRED -> EXTRACTED)

Evidence: `evaluate_retrieval_configuration() --uses--> HybridIndustrialRetriever [INFERRED]`, `evaluate_retrieval() --uses--> HybridIndustrialRetriever [INFERRED]`.

Plan:
- Extract `backend/app/eval/harness.py`: `evaluate_retrieval_configuration()`, `evaluate_retrieval()`, `build_experiment_index()` (currently in `scripts/`).
- Make `scripts/evaluate.py`, `scripts/evaluate_ci.py`, `scripts/evaluate_extended.py`, `scripts/run_retrieval_experiments.py` thin wrappers calling harness with explicit imports.
- Preserve `get_model_revision()` (`backend/app/rag/embeddings.py`) pinning in harness.

Acceptance:
- [ ] Next graphify run shows 0 INFERRED edges for eval -> retriever
- [ ] `python scripts/evaluate_ci.py` used in CI

## 2.4 LLM / Azure Notes (document decision)

- Keep `get_chat_model()` (`backend/app/llm/factory.py`), `TokenUsageCallbackHandler`, `calculate_llm_cost()` - already covers Ollama + Azure OpenAI + HF `bge-large-en-v1.5`.
- Document why LlamaIndex not added (LangGraph + native FAISS suffices for HITL control), and roadmap for `Azure AI Search` + Document Intelligence behind feature flag (see Phase 3).
