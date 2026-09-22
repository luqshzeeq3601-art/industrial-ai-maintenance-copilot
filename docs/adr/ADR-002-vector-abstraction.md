# ADR-002: VectorStore abstraction (FAISS default, Milvus/Azure optional)

Status: Accepted. Context: JD Advantage wants Milvus/Pinecone/Chroma + Azure AI Services, prod runs FAISS RRF k=60.
Decision: `VectorStore` protocol (`rag/vector_base.py`), `FaissStore` prod, `MilvusStore` lite, `AzureAISearchRetriever` stub (`rag/azure_search.py`), switch `VECTOR_BACKEND=faiss|milvus|azure_search`.
Consequences: No FAISS regression, eval compares backends, Azure live wiring pending with fail-fast env check.
