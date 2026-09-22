"""Prompt-injection guard (split from abstention.py god function)."""
import re
import logging

logger = logging.getLogger("copilot.guardrails.injection")

PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|safety)?\s*(safety\s+)?(instructions|rules|guidelines)",
    r"disregard\s+(prior|previous|all)\s+(rules|instructions)",
    r"system\s+override",
    r"system\s+prompt\s+override",
    r"you\s+are\s+now\s+(in\s+)?(dan|jailbreak|unrestricted)\s+mode",
    r"reveal\s+(the\s+)?(system|secret|internal)\s+(prompt|keys|passwords)",
    r"hack\s+",
    r"bypass\s+.*(code|safety|password|auth|security)",
    r"drop\s+table\s+",
    r"delete\s+from\s+",
    r"union\s+select\s+",
    r"<script[\s>]",
    r"javascript:",
]


def check_injection(query_lower: str):
    for pat in PROMPT_INJECTION_PATTERNS:
        if re.search(pat, query_lower):
            logger.warning("Prompt injection guardrail triggered")
            return False, (
                "🛡️ **Security Guardrail Triggered**: The request contains unauthorized system instructions, "
                "injection patterns, or unsafe commands. Request has been logged and refused."
            )
    return True, ""
