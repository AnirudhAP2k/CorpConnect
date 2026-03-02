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
from app.routers import embed, recommend, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Initialise DB connection pool and load embedding model on startup
    await init_db_pool()
    load_model()
    yield
    # Clean up on shutdown
    await close_db_pool()


app = FastAPI(
    title="Evently AI Service",
    description="AI-powered recommendations, embeddings, and semantic search for the Evently platform.",
    version="1.0.0",
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


@app.get("/health", tags=["Health"])
async def health():
    """Health check — returns model name and service version."""
    return {
        "status": "ok",
        "model": settings.MODEL_NAME,
        "version": settings.SERVICE_VERSION,
    }
