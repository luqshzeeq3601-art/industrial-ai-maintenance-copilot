"""OpenTelemetry Distributed Tracing configuration and span utilities."""
import logging
from contextlib import contextmanager
from typing import Optional, Dict, Any

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from backend.app.config import settings

logger = logging.getLogger(__name__)

_tracer: Optional[trace.Tracer] = None

def init_tracer() -> trace.Tracer:
    """Initialize OpenTelemetry TracerProvider with OTLP or fallback."""
    global _tracer
    if _tracer is not None:
        return _tracer

    resource = Resource.create({
        "service.name": getattr(settings, "OTEL_SERVICE_NAME", "industrial-ai-copilot"),
        "service.version": "1.0.0",
        "deployment.environment": getattr(settings, "ENV", "development")
    })

    provider = TracerProvider(resource=resource)

    # Check for OTLP exporter if configured
    otlp_endpoint = getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", None)
    if otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info("OpenTelemetry OTLP exporter initialized for %s", otlp_endpoint)
        except Exception as e:
            logger.warning("Failed to initialize OTLP exporter (%s); falling back to NoOp", e)
    else:
        logger.debug("No OTLP endpoint configured; using in-memory tracer")

    trace.set_tracer_provider(provider)
    _tracer = trace.get_tracer("industrial-copilot", "1.0.0")
    return _tracer

def get_tracer() -> trace.Tracer:
    """Get active OpenTelemetry tracer."""
    global _tracer
    if _tracer is None:
        return init_tracer()
    return _tracer

@contextmanager
def trace_span(name: str, attributes: Optional[Dict[str, Any]] = None):
    """Context manager for distributed trace spans with automatic attribute tagging."""
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        if attributes and span.is_recording():
            for k, v in attributes.items():
                if v is not None:
                    span.set_attribute(str(k), str(v))
        try:
            yield span
        except Exception as exc:
            if span.is_recording():
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR, str(exc))
            raise
