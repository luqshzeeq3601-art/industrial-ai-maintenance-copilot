"""Shared AgentState schema for multi-agent LangGraph workflow."""
from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    next: Optional[str]
    citations: List[Dict[str, Any]]
    workflow_trace: List[Dict[str, Any]]
    confidence: float
    abstain: bool
    # New security, RBAC & Human-in-the-Loop fields
    session_id: Optional[str]
    user_id: Optional[str]
    user_role: Optional[str]
    pending_action: Optional[Dict[str, Any]]
    action_result: Optional[Dict[str, Any]]
    evidence_chunks: List[Dict[str, Any]]
    status: str # 'completed', 'approval_required', 'rejected', 'failed'
    error: Optional[str]
