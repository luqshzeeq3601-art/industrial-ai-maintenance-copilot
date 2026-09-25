"""Maintenance Copilot API Gateway with Security, Telemetry, and RBAC."""
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage

from backend.app.config import settings
from backend.app.database.models import init_db
from backend.app.agents.graph import get_graph
from backend.app.api.v1 import api_v1_router
from backend.app.api.compat import router as compat_router
from backend.app.auth.security import get_current_user_optional
from backend.app.telemetry.logger import setup_telemetry_logger, sanitize_data
from backend.app.telemetry.metrics import (
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_DURATION_SECONDS,
    ABSTENTION_EVENTS_TOTAL,
    metrics_response
)

from backend.app.telemetry.tracer import init_tracer

logger = setup_telemetry_logger("copilot-gateway")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI Lifespan managing DB migrations, tracing, and graph checkpointer startup/shutdown."""
    logger.info("Initializing OpenTelemetry tracer and database migrations...")
    settings.validate_prod_secrets()
    init_tracer()
    init_db()
    # Pre-compile multi-agent graph with persistent SQLite checkpointer
    get_graph()
    logger.info("Maintenance Copilot initialized successfully.")
    yield
    logger.info("Maintenance Copilot shutting down.")

app = FastAPI(
    title="Maintenance Copilot",
    description="Multi-agent industrial assistant powered by LangGraph, SQLite checkpointing, FAISS RRF, and Argon2 RBAC.",
    version="1.0.0",
    lifespan=lifespan
)

# Restrict CORS to configured plant network origins
cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers & Tracing Middleware
@app.middleware("http")
async def security_and_tracing_middleware(request: Request, call_next):
    # Enforce max request size
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_REQUEST_SIZE_BYTES:
        return Response(
            content=json.dumps({"error": "Payload Too Large", "code": "ERR_PAYLOAD_LIMIT"}),
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            media_type="application/json"
        )

    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.time()

    # Process request
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(
            f"Unhandled exception on {request.method} {request.url.path}: {exc}",
            extra={"request_id": request_id, "error_code": "ERR_INTERNAL"}
        )
        return Response(
            content=json.dumps({
                "error": "An internal server error occurred.",
                "code": "ERR_INTERNAL",
                "request_id": request_id
            }),
            status_code=500,
            media_type="application/json"
        )

    duration = time.time() - start_time

    # Record telemetry metrics
    endpoint = request.url.path
    HTTP_REQUESTS_TOTAL.labels(
        method=request.method,
        endpoint=endpoint,
        status_code=str(response.status_code)
    ).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(endpoint=endpoint).observe(duration)

    # Attach Security Headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

    return response

# Mount API v1 Routers + legacy compat (extracted P0-3)
app.include_router(api_v1_router)
app.include_router(compat_router)

# Prometheus Metrics Scrape Endpoint
@app.get("/metrics", tags=["Telemetry"])
def prometheus_metrics():
    """Prometheus telemetry scrape endpoint."""
    return metrics_response()

# Contracts
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Technician query or maintenance request.")
    session_id: Optional[str] = Field(default=None, description="Thread session ID for multi-turn state.")

class ChatResponse(BaseModel):
    answer: str
    session_id: str
    workflow_trace: List[Dict[str, Any]]
    agent_path: List[str]
    citations: List[Dict[str, Any]]
    abstain: bool
    status: str = Field(default="completed", description="'completed' | 'approval_required' | 'rejected' | 'failed'")
    request_id: str
    pending_action: Optional[Dict[str, Any]] = None
    action_result: Optional[Dict[str, Any]] = None

@app.get("/health", tags=["System"])
async def health_check():
    """Service health and diagnostic status."""
    return {
        "status": "healthy",
        "env": settings.ENV,
        "model": settings.LLM_MODEL,
        "embedding": settings.EMBEDDING_MODEL_NAME,
        "checkpointer": "SqliteSaver (checkpoints.db)"
    }

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
async def chat_endpoint(payload: ChatRequest, request: Request):
    """Execute query across LangGraph multi-agent system with human-in-the-loop approval."""
    session_id = payload.session_id or str(uuid.uuid4())
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    user = get_current_user_optional(request)

    graph = get_graph()
    config = {"configurable": {"thread_id": session_id}}

    inputs = {
        "messages": [HumanMessage(content=payload.message)],
        "workflow_trace": [],
        "citations": [],
        "abstain": False,
        "confidence": 1.0,
        "session_id": session_id,
        "user_id": user["username"] if user else None,
        "user_role": user["role"] if user else None,
        "pending_action": None,
        "action_result": None,
        "status": "completed",
        "evidence_chunks": []
    }

    try:
        final_state = graph.invoke(inputs, config=config)

        # Check if graph paused for approval via interrupt()
        state_snap = graph.get_state(config)
        is_interrupted = bool(state_snap.tasks and any(t.interrupts for t in state_snap.tasks))

        pending_action = None
        if is_interrupted and state_snap.tasks[0].interrupts:
            raw_val = state_snap.tasks[0].interrupts[0].value
            pending_action = raw_val if isinstance(raw_val, dict) else {"details": raw_val}
            pending_action["session_id"] = session_id
            status_str = "approval_required"
            answer_text = (
                f"⏸️ **Supervisor Approval Required**\n\n"
                f"{pending_action.get('summary', 'The requested maintenance action requires supervisor authorization.')}\n\n"
                f"*Action ID: `{pending_action.get('action_id', 'N/A')}`*"
            )
        else:
            messages = final_state.get("messages", [])
            answer_text = next((m.content for m in reversed(messages) if isinstance(m, AIMessage)), "No response produced.")
            status_str = final_state.get("status", "completed")

        trace = final_state.get("workflow_trace", [])
        agent_path = [t["agent"] for t in trace if "agent" in t]
        abstain = final_state.get("abstain", False)

        if abstain:
            ABSTENTION_EVENTS_TOTAL.labels(reason="out_of_domain_or_evidence").inc()

        return ChatResponse(
            answer=answer_text,
            session_id=session_id,
            workflow_trace=trace,
            agent_path=agent_path,
            citations=final_state.get("citations", []),
            abstain=abstain,
            status=status_str,
            request_id=request_id,
            pending_action=pending_action,
            action_result=final_state.get("action_result")
        )
    except Exception as e:
        logger.error(f"Error in multi-agent execution: {e}", exc_info=True, extra={"request_id": request_id})
        raise HTTPException(
            status_code=500,
            detail=f"Agent execution encountered an error. Correlation ID: {request_id}"
        )

@app.post("/api/chat/stream", tags=["Chat"])
async def chat_stream(payload: ChatRequest, request: Request):
    """Stream token outputs and workflow step events using Server-Sent Events (SSE)."""
    session_id = payload.session_id or str(uuid.uuid4())
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    user = get_current_user_optional(request)

    graph = get_graph()
    config = {"configurable": {"thread_id": session_id}}

    inputs = {
        "messages": [HumanMessage(content=payload.message)],
        "workflow_trace": [],
        "citations": [],
        "abstain": False,
        "confidence": 1.0,
        "session_id": session_id,
        "user_id": user["username"] if user else None,
        "user_role": user["role"] if user else None,
        "pending_action": None,
        "action_result": None,
        "status": "completed",
        "evidence_chunks": []
    }

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'session_init', 'session_id': session_id, 'request_id': request_id})}\n\n"

            async for event in graph.astream_events(inputs, config=config, version="v2"):
                kind = event.get("event")
                name = event.get("name", "")

                # Token streaming
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, "content") and chunk.content:
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

                # Agent transitions
                elif kind == "on_chain_start" and name in ["supervisor", "retrieval", "diagnostic", "maintenance", "approval"]:
                    yield f"data: {json.dumps({'type': 'agent_start', 'agent': name})}\n\n"

                # Tool executions
                elif kind == "on_tool_start":
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': name, 'input': sanitize_data(event['data'].get('input'))})}\n\n"

                elif kind == "on_tool_end":
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': name})}\n\n"

            # Check for interrupt / approval state
            state_snap = graph.get_state(config)
            is_interrupted = bool(state_snap.tasks and any(t.interrupts for t in state_snap.tasks))

            final_values = state_snap.values if state_snap else {}
            trace = final_values.get("workflow_trace", [])
            citations = final_values.get("citations", [])
            abstain = final_values.get("abstain", False)

            if is_interrupted and state_snap.tasks[0].interrupts:
                pending_action = state_snap.tasks[0].interrupts[0].value
                if isinstance(pending_action, dict):
                    pending_action["session_id"] = session_id
                yield f"data: {json.dumps({'type': 'approval_required', 'pending_action': pending_action})}\n\n"
                status_str = "approval_required"
            else:
                status_str = final_values.get("status", "completed")

            yield f"data: {json.dumps({'type': 'done', 'workflow_trace': trace, 'citations': citations, 'abstain': abstain, 'status': status_str})}\n\n"
        except Exception as err:
            logger.error(f"Streaming error: {err}", extra={"request_id": request_id})
            yield f"data: {json.dumps({'type': 'error', 'code': 'ERR_STREAM', 'request_id': request_id, 'message': 'Execution encountered an error.'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
