"""Document retrieval tool with thread/async-isolated context to prevent cross-request citation leakage."""
import contextvars
import logging
from typing import List, Dict, Any
from langchain_core.tools import tool
from backend.app.rag.retriever import get_retriever
from backend.app.guardrails.abstention import evaluate_evidence
from backend.app.tools.schemas import SearchDocsInput

logger = logging.getLogger("copilot.tools.search_docs")

# Request-isolated context variable (prevents cross-request race condition / citation leakage)
_request_citations: contextvars.ContextVar[List[Dict[str, Any]]] = contextvars.ContextVar(
    "request_citations", default=[]
)

def get_last_citations() -> List[Dict[str, Any]]:
    """Return structured citation metadata for the current request context."""
    return list(_request_citations.get())

def set_last_citations(citations: List[Dict[str, Any]]):
    """Set citations in the current request context."""
    _request_citations.set(list(citations))

@tool(args_schema=SearchDocsInput)
def search_technical_docs(query: str) -> str:
    """Search machine operating manuals, technical specifications, and Standard Operating Procedures (SOPs).
    Use this tool whenever the technician asks about fault codes (e.g. E-402, H-104),
    troubleshooting procedures, bearing replacement, lubrication intervals, or safety guidelines.
    """
    _request_citations.set([])

    try:
        retriever = get_retriever()
        results = retriever.retrieve(query, k=4)

        # Wire evaluate_evidence() guardrail — abstain on weak evidence
        is_sufficient, refusal_msg = evaluate_evidence(results)
        if not is_sufficient:
            logger.warning(f"Evidence abstention triggered for query: {query[:80]}")
            return refusal_msg

        # Build structured citations
        citations = []
        output_lines = ["--- Technical Documentation Findings ---"]
        for idx, doc in enumerate(results, 1):
            source = doc.get("source", "Unknown Document")
            score = doc.get("score", 0.0)
            ret_type = doc.get("retrieval_type", "hybrid")
            content_snippet = doc["content"].strip()

            citations.append({
                "citation_id": idx,
                "source": source,
                "doc_type": doc.get("doc_type", "technical"),
                "retrieval_type": ret_type,
                "confidence": score,
                "snippet": content_snippet[:300]
            })

            output_lines.append(f"\n[Citation {idx}: {source} | Match: {ret_type} | Confidence: {score}]")
            output_lines.append(content_snippet)

        output_lines.append("\n--- End of Citations ---")

        # Store in task-isolated context variable
        _request_citations.set(citations)

        return "\n".join(output_lines)
    except Exception as e:
        logger.error(f"Document retrieval error: {e}", exc_info=True)
        return f"Error retrieving documentation: {str(e)}"
