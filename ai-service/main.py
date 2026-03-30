"""
Evently AI Service — main.py
FastAPI application entry point.

Auth modes:
  - Master JWT (Authorization: Bearer <token>)  → internal Next.js calls, bypasses tier gate
  - Tenant key (X-Tenant-ID + X-API-Key)         → external org calls, tier-gated
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db_pool, close_db_pool
from app.embeddings import load_model
from app.cache import init_cache
from app.llm import is_llm_configured
from app.routers import embed, recommend, search, ingest, generate

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Initialise DB connection pool, load embedding model, and init cache on startup
    await init_db_pool()
    await init_cache()
    load_model()
    # Report LLM readiness
    if is_llm_configured():
        print(f"🧠 LLM ready — provider={settings.LLM_PROVIDER} model={settings.LLM_MODEL_NAME}")
    else:
        print("⚠️  LLM not configured — set LLM_API_KEY in .env to enable generative features")
    yield
    # Clean up on shutdown
    await close_db_pool()


app = FastAPI(
    title="Evently AI Service",
    description=(
        "AI-powered recommendations, embeddings, semantic search, "
        "generative content, RAG chat, and n8n automation for the Evently platform."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — restrict to Next.js origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(embed.router,     prefix="/embed",     tags=["Embeddings"])
app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])
app.include_router(search.router,    prefix="/search",    tags=["Search"])
app.include_router(ingest.router,    prefix="/ingest",    tags=["Document Ingestion"])
app.include_router(generate.router,  prefix="/generate",  tags=["Content Generation"])


@app.get("/health", tags=["Health"])
async def health():
    """Health check — returns model name, LLM readiness, and service version."""
    llm_ready = is_llm_configured()
    return {
        "status":       "ok",
        "model":        settings.MODEL_NAME,
        "llm_provider": settings.LLM_PROVIDER if llm_ready else "not configured",
        "llm_model":    settings.LLM_MODEL_NAME if llm_ready else None,
        "llm_ready":    llm_ready,
        "version":      settings.SERVICE_VERSION,
    }
