import json
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True

    # Persistence Backend
    PERSISTENCE_BACKEND: str = "sqlite"  # "sqlite" | "postgres"
    DATABASE_URL: Optional[str] = None
    CHECKPOINT_DATABASE_URL: Optional[str] = None

    # LLM Provider Configuration
    LLM_PROVIDER: str = "ollama"  # "ollama" | "azure_openai"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    LLM_TEMPERATURE: float = 0.1
    LLM_CONTEXT_WINDOW: int = 8192
    LLM_REQUEST_TIMEOUT_S: float = 30.0
    LLM_MAX_RETRIES: int = 1

    # Azure OpenAI Configuration
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-05-01-preview"
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_COST_PER_1K_PROMPT: Optional[float] = None
    AZURE_OPENAI_COST_PER_1K_COMPLETION: Optional[float] = None

    # Embeddings
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-large-en-v1.5"
    DEVICE: str = "cuda"

    # Paths (relative to root)
    DATABASE_PATH: Path = BASE_DIR / "backend" / "app" / "database" / "maintenance.db"
    CHECKPOINT_DB_PATH: Path = BASE_DIR / "backend" / "app" / "database" / "checkpoints.db"
    VECTOR_STORE_DIR: Path = BASE_DIR / "vector_store"
    DOCS_DIR: Path = BASE_DIR / "data"

    # Security & Auth - MUST be overridden via env/KeyVault in prod.
    # Azure KeyVault fallback: set AZURE_KEYVAULT_URL and mount secrets as env vars
    # (e.g. via ExternalSecrets). Pydantic reads env automatically; no code change needed.
    JWT_SECRET: str = "industrial-copilot-secure-secret-key-32chars!"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    AZURE_KEYVAULT_URL: Optional[str] = None
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    RATE_LIMIT_LOGIN_PER_MIN: int = 10
    RATE_LIMIT_ACTION_PER_MIN: int = 30
    MAX_REQUEST_SIZE_BYTES: int = 1024 * 1024

    # Machine Telemetry HMAC Authentication - override TELEMETRY_HMAC_SECRET in prod.
    TELEMETRY_HMAC_SECRET: str = "default_telemetry_secret_key_change_in_prod"
    TELEMETRY_HMAC_REQUIRED: bool = False
    HMAC_SECRETS_RAW: str = '{"default-key": "default_telemetry_secret_key_change_in_prod", "sim-key-1": "sim-secret-key-4455", "rest-client": "prod-rest-secret-key-9988"}'
    HMAC_MAX_CLOCK_SKEW_SECONDS: int = 300

    # MQTT Machine Connectivity - override MQTT_PASSWORD in prod.
    MQTT_ENABLED: bool = False
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_USERNAME: Optional[str] = "industrial_agent"
    MQTT_PASSWORD: Optional[str] = None
    MQTT_SITE_ID: str = "site-01"
    MQTT_TOPIC: str = "factory/+/telemetry"

    # Observability & Tracing
    OTEL_EXPORTER_OTLP_ENDPOINT: Optional[str] = None
    OTEL_SERVICE_NAME: str = "industrial-ai-copilot"

    # Reranking Gate
    ENABLE_RERANKER: bool = False
    RERANKER_MODEL_NAME: str = "cross-encoder/ms-marco-MiniLM-L6-v2"
    RERANKER_CANDIDATE_DEPTH: int = 12

    # Retrieval optimization (controlled experiments; production index untouched until gate passes)
    # Promoted winner E1b (verified): header-aware semantic blocks 320/450/48.
    CHUNKING_RECIPE: str = "semantic_blocks_320_450_48"
    METADATA_SCHEMA_VERSION: str = "1.1.0"
    ENABLE_QUERY_EXPANSION: bool = False
    VECTOR_BACKEND: str = "faiss"  # faiss | milvus | azure_search (roadmap)

    @property
    def hmac_secrets(self) -> Dict[str, str]:
        try:
            return json.loads(self.HMAC_SECRETS_RAW)
        except Exception:
            return {"default-key": "secret-key-change-in-prod"}

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def validate_prod_secrets(self) -> None:
        """Fail fast in production if default secrets are still in use."""
        if self.ENV.lower() != "production":
            return
        bad_defaults = {
            "industrial-copilot-secure-secret-key-32chars!",
            "default_telemetry_secret_key_change_in_prod",
            "change-me-32chars-min-in-prod",
            "change-me-in-prod",
        }
        if self.JWT_SECRET in bad_defaults or len(self.JWT_SECRET) < 32:
            raise ValueError("ENV=production requires a strong JWT_SECRET (>=32 chars, non-default).")
        if self.TELEMETRY_HMAC_SECRET in bad_defaults:
            raise ValueError("ENV=production requires TELEMETRY_HMAC_SECRET override + TELEMETRY_HMAC_REQUIRED=true.")
        if self.TELEMETRY_HMAC_REQUIRED is False:
            raise ValueError("ENV=production requires TELEMETRY_HMAC_REQUIRED=true.")


settings = Settings()
