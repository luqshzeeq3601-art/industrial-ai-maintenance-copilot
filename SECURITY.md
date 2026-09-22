# Security Policy

## Secrets
- Never commit `.env`, `*.key`, `*.pem`, real `deploy/k8s/base/secrets.yaml` values.
  Template only (`CHANGEME_VIA_EXTERNAL_SECRETS`); prod uses ExternalSecrets/KeyVault.
- `ENV=production` refuses to boot on default secrets (`config.validate_prod_secrets()`).
- Rotate any committed credential immediately.

## Auth
- Argon2id password hashing, JWT HttpOnly cookies (`secure=True` in prod), CSRF token,
  RBAC `technician < supervisor < admin`. Technicians cannot approve actions.

## Ingestion
- Telemetry requires HMAC (`TELEMETRY_HMAC_REQUIRED=true` in prod, 300s clock skew).
  Telemetry creates alarms only, never auto work orders (HITL isolation).

## Reporting
- Report vulnerabilities via private issue; include `request_id` (`X-Request-ID` header)
  and `action_audit` IDs where relevant. Do not post secrets in issues.
