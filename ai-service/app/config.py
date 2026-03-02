from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # Auth
    MASTER_KEY: str                    # Shared secret for master JWT

    # Embedding model
    MODEL_NAME: str = "all-MiniLM-L6-v2"

    # Redis (optional — cache is disabled if REDIS_URL is not set)
    REDIS_URL: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Recommendation defaults
    DEFAULT_RECOMMEND_LIMIT: int = 10
    RECOMMENDATION_CACHE_TTL: int = 300   # seconds (5 min)
    SEARCH_CACHE_TTL: int = 60             # seconds

    # Service version
    SERVICE_VERSION: str = "1.0.0"

settings = Settings()
