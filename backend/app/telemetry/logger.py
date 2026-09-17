"""Structured JSON telemetry logging with automatic credential redaction."""
import json
import logging
import time
from typing import Dict, Any, Optional

SENSITIVE_KEYS = {"password", "token", "jwt", "authorization", "secret", "cookie", "csrf_token"}

def sanitize_data(data: Any) -> Any:
    """Recursively redact sensitive credentials and secrets from logs."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, (dict, list)):
                sanitized[k] = sanitize_data(v)
            elif isinstance(v, str) and len(v) > 500:
                sanitized[k] = v[:500] + "... [TRUNCATED]"
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data

class StructuredJsonFormatter(logging.Formatter):
    """Format log records as single-line JSON objects."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include structured extra fields if present
        for attr in ["request_id", "agent", "action", "tool", "duration_ms", "error_code"]:
            if hasattr(record, attr):
                log_obj[attr] = getattr(record, attr)

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(sanitize_data(log_obj))

def setup_telemetry_logger(name: str = "copilot") -> logging.Logger:
    """Configure structured JSON logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
