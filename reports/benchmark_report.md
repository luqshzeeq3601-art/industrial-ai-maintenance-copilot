# Industrial AI Maintenance Copilot — Benchmark Report

**Date:** 2026-09-17 16:13:38 UTC  
**Execution Time:** 35.83s  
**Total Benchmark Cases:** 50

## 1. Domain Guardrail & Abstention Performance

| Metric | Value |
| :--- | :---: |
| **Domain Classification Accuracy** | **100.0%** (50/50) |
| **Abstention Precision** | **100.0%** |
| **Abstention Recall** | **100.0%** |
| **Confusion Matrix** | TP=36, FP=0, TN=14, FN=0 |

## 2. Frozen Retrieval Configurations Comparison

| Configuration | Recall@1 | Recall@3 | Recall@5 | MRR | Latency p50 | Latency p95 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Config 1: Fusion Only (RRF) | 72.4% | **96.6%** | 100.0% | **0.83** | 253.4ms | 331.5ms |
| Config 2: Fusion + Metadata Filtering | 72.4% | **96.6%** | 100.0% | **0.83** | 233.8ms | 262.1ms |

## 3. Deployment & Quality Gate Verdict

- **Reciprocal Rank Fusion (RRF)** replaces fabricated BM25 scores with mathematical reciprocal rank fusion.
- **Zero Pickle Vulnerabilities**: All vector search operations execute via native FAISS C++ indices and SHA-256 verified manifests.
- **Quality Gates**: All latency metrics (<2000ms) and accuracy targets met.
