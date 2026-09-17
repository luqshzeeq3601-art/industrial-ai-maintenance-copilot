"""Prometheus metrics instrumentation for requests, tools, approvals, and latency."""
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

# Request counters and latency histograms
HTTP_REQUESTS_TOTAL = Counter(
    "copilot_http_requests_total",
    "Total count of HTTP requests",
    ["method", "endpoint", "status_code"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "copilot_http_request_duration_seconds",
    "HTTP request latency distribution in seconds",
    ["endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
)

# Agent and tool metrics
AGENT_INVOCATIONS_TOTAL = Counter(
    "copilot_agent_invocations_total",
    "Total invocations per specialist agent",
    ["agent"]
)

TOOL_EXECUTIONS_TOTAL = Counter(
    "copilot_tool_executions_total",
    "Total tool calls by name and status",
    ["tool", "status"]
)

APPROVAL_DECISIONS_TOTAL = Counter(
    "copilot_approval_decisions_total",
    "Human supervisor approval outcomes",
    ["action_type", "decision"]
)

ABSTENTION_EVENTS_TOTAL = Counter(
    "copilot_abstention_events_total",
    "Abstention guardrail triggers",
    ["reason"]
)

def metrics_response() -> Response:
    """Generate Prometheus scrape endpoint response."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
