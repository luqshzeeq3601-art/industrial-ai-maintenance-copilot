from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    LLM_TEMPERATURE: float = 0.1
    LLM_CONTEXT_WINDOW: int = 8192

    # Embeddings
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-large-en-v1.5"
    DEVICE: str = "cuda"

    # Paths (relative to root)
    DATABASE_PATH: Path = BASE_DIR / "backend" / "app" / "database" / "maintenance.db"
    CHECKPOINT_DB_PATH: Path = BASE_DIR / "backend" / "app" / "database" / "checkpoints.db"
    VECTOR_STORE_DIR: Path = BASE_DIR / "vector_store"
    DOCS_DIR: Path = BASE_DIR / "data"

    # Security & Auth
    JWT_SECRET: str = "industrial-copilot-secure-secret-key-32chars!"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"
    RATE_LIMIT_LOGIN_PER_MIN: int = 10
    RATE_LIMIT_ACTION_PER_MIN: int = 30
    MAX_REQUEST_SIZE_BYTES: int = 1024 * 1024

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
