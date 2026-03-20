from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # Auth
    MASTER_KEY: str                    # Shared secret for master JWT

    # Embedding model (all-MiniLM-L6-v2 — stays unchanged)
    MODEL_NAME: str = "all-MiniLM-L6-v2"

    # Redis (optional — cache is disabled if REDIS_URL is not set)
    REDIS_URL: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Recommendation defaults
    DEFAULT_RECOMMEND_LIMIT: int = 10
    RECOMMENDATION_CACHE_TTL: int = 300   # seconds (5 min)
    SEARCH_CACHE_TTL: int = 60             # seconds

    # ─── LLM (Generative AI) ──────────────────────────────────────────────────
    LLM_PROVIDER: str = "groq"
    LLM_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_API_KEY: str = ""
    LLM_MODEL_NAME: str = "llama-3.1-8b-instant"
    LLM_MAX_TOKENS: int = 800

    # ─── n8n (Agentic Automation) ────────────────────────────────────────────
    # HMAC secret used to sign/verify webhook payloads between Evently and n8n
    N8N_WEBHOOK_SECRET: str = ""

    # Service version
    SERVICE_VERSION: str = "2.0.0"

settings = Settings()
