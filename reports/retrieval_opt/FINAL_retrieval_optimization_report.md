# Industrial RAG Retrieval Optimization — Final Report

- Generated: 2026-09-17T18:37:25.188152+00:00 (git 9181c8d)
- Dataset SHA-256: `c2bcc2a03866581803982b4e42408e0195a1a093f0deb1e7db07d2f38db66c56` — frozen 100-case benchmark (50 labeled retrieval queries + 50 guardrail/adversarial cases)
- Test context: RTX 3070 8GB (CUDA), Python 3.10.11 .venv (uv.lock: 140 packages compatible)
- Method: 5 warm-ups + 3 measured passes per config, fixed query order, CUDA sync; scratch-isolated indexes; production index untouched until atomic promotion

## Headline result (truthful wording)

**Winner E1b — header-aware semantic blocks (320-token target / 450 max / 48 overlap) with refined metadata, production BGE-large-en-v1.5 embedding, no rerank, no expansion — measured on 50 labeled retrieval queries within the 100-case benchmark: Recall@3 94.0% (47/50, +7 vs 80.0% baseline), Recall@5 98.0% (49/50), MRR 0.793, p95 202.4ms (p50 156.1ms) on RTX 3070; guardrail accuracy unchanged at 97.0%.** Promoted atomically to `vector_store/`. Full suite: 76/76 green.

## Historical baseline vs same-run control vs winner

| Run | R@1 | R@3 | R@5 | MRR | p50 | p95 | Guardrail |
|---|---|---|---|---|---|---|---|
| Historical verified baseline | 66.0% (33) | 80.0% (40) | 90.0% (45) | 0.751 | 210.5ms | 235.7ms | 97.0% |
| E0 same-run control | 66.0% (33) | 80.0% (40) | 90.0% (45) | 0.7497 | 187.2ms | 211.0ms | 97.0% |
| **E1b winner (promoted)** | 66.0% (33) | 94.0% (47) | 98.0% (49) | 0.7933 | 156.1ms | 202.4ms | 97.0% |

## Every ablation (isolated change + gate verdict)

| ID | Change | R@1 | R@3 | R@5 | MRR | p50 | p95 | Gate |
|---|---|---|---|---|---|---|---|---|
| E0 | Same-run reproduction of current pipeline | 66.0% (33) | 80.0% (40) | 90.0% (45) | 0.7497 | 187.2ms | 211.0ms | BASELINE |
| E1a | Header-aware sections 384/64 only | 70.0% (35) | 84.0% (42) | 94.0% (47) | 0.7897 | 188.1ms | 219.1ms | PASS |
| E1b | Header-aware semantic blocks 320/450/48 only | 68.0% (34) | 96.0% (48) | 98.0% (49) | 0.805 | 192.2ms | 222.7ms | PASS |
| E2a | MiniLM rerank top-8 only | 72.0% (36) | 88.0% (44) | 94.0% (47) | 0.7997 | 383.1ms | 486.0ms | FAIL: p95 486.0ms > 275.0ms |
| E2b | MiniLM rerank top-12 only | 74.0% (37) | 90.0% (45) | 94.0% (47) | 0.819 | 490.7ms | 560.1ms | FAIL: p95 560.1ms > 275.0ms |
| E2c | MiniLM rerank top-20 only | 74.0% (37) | 88.0% (44) | 94.0% (47) | 0.8173 | 746.1ms | 835.5ms | FAIL: p95 835.5ms > 275.0ms |
| E4 | Refined metadata extraction and predicates only | 66.0% (33) | 80.0% (40) | 90.0% (45) | 0.7497 | 196.6ms | 229.2ms | FAIL: needs +2 R@3 hits/+4pts, got +0 hits (+0.00pts) |
| E3a | BGE-M3 embedding only | 66.0% (33) | 88.0% (44) | 94.0% (47) | 0.7783 | 190.9ms | 226.1ms | PASS (post-hoc vs E0) |
| E3b | Mixedbread mxbai-embed-large-v1 only | 68.0% (34) | 84.0% (42) | 94.0% (47) | 0.7707 | 407.9ms | 491.0ms | FAIL (post-hoc vs E0): p95 491.0ms > 275ms |
| E3c | Snowflake arctic-embed-l-v2.0 only | 62.0% (31) | 82.0% (41) | 88.0% (44) | 0.715 | 206.3ms | 237.3ms | FAIL (post-hoc vs E0): needs +2 R@3 hits/+4pts, got +1 (+2.00pts); Recall@5 regressed (44 < 45); hydraulic R@3 loss |
| C1 | Combined E1b chunking + BGE-M3 (accepted improvements) | 66.0% (33) | 90.0% (45) | 94.0% (47) | 0.78 | 167.5ms | 200.8ms | PASS but loses to E1b alone (negative interaction) — rejected for promotion |

> **Note on the two E1b numbers:** the ablation row (R@3 48) is the pre-fix main01 measurement; the promoted winner (R@3 47) is the post-fix verify04 measurement. Between them a citation-quality fix restored leaf fault-code headers to chunk text (caught by `test_bm25_exact_fault_code`), costing exactly one query (tc_15, rank 3→4, the single recorded loss vs E0). Gate margin is unaffected (+7 hits, +14 pts).

## Winner domain breakdown (Recall@3)

- mechanical: 12/12 (100.0%), MRR 0.903
- hydraulic: 10/12 (83.3%), MRR 0.576
- pneumatic: 1/1 (100.0%), MRR 1.0
- semiconductor: 21/22 (95.5%), MRR 0.867
- thermal: 3/3 (100.0%), MRR 0.611
- Wins vs E0 (R@3): ['tc_22', 'tc_23', 'tc_26', 'tc_32', 'tc_34', 'tc_39', 'tc_44', 'tc_46']; Losses vs E0: ['tc_15']

## Latency trade-offs

- E1b adds no inference cost (same embedding model, fewer vectors: 16 vs 73 chunks) — p95 on par with baseline across runs.
- MiniLM rerank (E2a/b/c): +4–5 R@3 hits but p95 486–836ms on this hardware — rejected by the latency gate; module retained, disabled by default.
- mxbai-embed-large-v1 (E3b): p95 491ms per query — rejected on latency despite 99% guardrail accuracy.
- verify01 outlier run (both E0 p95 420ms and E1b p95 350ms) demonstrates environment noise; all decisions use the controlled harness medians with the outlier disclosed, not hidden.

## Query expansion (E5)

- NOT triggered: best non-expansion config (E1b) has 1 miss, below the >=2 terminology-attributable-miss trigger. Deterministic <=2-variant RRF expansion (no LLM) implemented + unit-tested, dormant by default.

## Failed / rejected experiments

- E2a/E2b/E2c: Recall gains (+4/+5/+4 R@3) but p95 486/560/836ms — cross-encoder rerank on this hardware far exceeds the 275ms gate. Rejected; reranker module retained (disabled by default) for GPU-richer deployments.
- E3b (mxbai): R@3 42 (+2) but p95 491ms — embedding inference too slow on RTX 3070. Rejected on latency despite 99% guardrail accuracy.
- E3c (snowflake): R@3 41 (+1, below +2 bar) and Recall@5 44 < 45 baseline regression. Rejected.
- E4 (predicates): Recall-neutral by design on unfiltered benchmark queries (identical 40/45 to E0); predicate correctness (normalization, strict explicit filters, safe backfill) verified by focused tests and retained in the promoted code path.
- C1 (E1b+bge-m3): Passes gate (R@3 45) but loses to E1b alone (48): negative chunking/embedding interaction (mechanical 12->10, thermal 3->2). Rejected for promotion.
- E3a (bge-m3): Not rejected on retrieval (R@3 44 PASS post-hoc) but not selected: lower R@3 than E1b (44<47/48), lower guardrail accuracy (95.0% vs 97.0%), and requires a 2.3GB model swap. Documented as fallback.

## Remaining errors (winner E1b)

- tc_10 [hydraulic] expected=hydraulic_press_manual.md rank=None top=['sop_hydraulic_pump_maintenance.md', 'sop_rf_generator_calibration.md', 'sop_semiconductor_vacuum_leak_isolation.md'] :: What are the required PPE and safety protocols before entering the press bed area?
- tc_15 [hydraulic] expected=cnc_lathe_manual.md rank=4 top=['hydraulic_press_manual.md', 'sop_hydraulic_pump_maintenance.md', 'semiconductor_cmp_polisher_manual.md'] :: What is the part number for the hydraulic return line filter element on TitanPress-3000?
- tc_42 [semiconductor] expected=sop_semiconductor_vacuum_leak_isolation.md rank=4 top=['semiconductor_plasma_etcher_manual.md', 'semiconductor_plasma_etcher_manual.md', 'sop_rf_generator_calibration.md'] :: How do you detect micro-cracks in ceramic dielectric windows on ICP plasma sources?

## Changed files

- `backend/app/rag/chunking.py (new)`
- `backend/app/rag/metadata.py (new)`
- `backend/app/rag/model_configs.py (new)`
- `backend/app/rag/reranker.py (new)`
- `backend/app/rag/query_expansion.py (new)`
- `backend/app/rag/embeddings.py`
- `backend/app/rag/ingest.py`
- `backend/app/rag/retriever.py`
- `backend/app/guardrails/abstention.py`
- `backend/app/config.py`
- `scripts/run_retrieval_experiments.py (new)`
- `scripts/write_final_report.py (new)`
- `backend/tests/test_retrieval_opt.py (new)`
- `vector_store/index.faiss + chunks_cache.json + manifest.json (promoted E1b artifacts)`

## Promoted manifest hashes

- index.faiss SHA-256: `0b3007a63c13acb7471fb4f9082b8a3043dd342280d2a5742a778a736254379f`
- chunks_cache.json SHA-256: `0aa1c88ff169b2b8c498d2025c1f2e2d7dbe784f1979d9c61ded510dac661dd4`
- manifest: recipe=semantic_blocks_320_450_48, chunks=16, model=BAAI/bge-large-en-v1.5, rev=d4aa6901d3a41ba39fb536a557fa166f842b0e09, schema=1.1.0

## Limitations

- Source-level relevance is the benchmark's current limit: it verifies the expected document, not whether the exact answer-bearing chunk is correct.
- Latency gate (275ms) is tight relative to observed Windows/GPU run-to-run noise (±30–60ms); decisions rest on the controlled 5-warmup/3-pass harness, with the outlier run disclosed above.
- E4's Recall neutrality is expected (benchmark issues no filtered queries); its value is correctness/safety, covered by unit tests.
