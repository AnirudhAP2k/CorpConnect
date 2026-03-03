# Evently AI Service

Python/FastAPI microservice for AI-powered recommendations, embeddings, and semantic search. Lives in the Evently monorepo at `ai-service/`.

## Setup

### 1. Prerequisites
- Python 3.11+
- PostgreSQL with pgvector enabled (run `npx ts-node scripts/enable-pgvector.ts` from the root)
- Redis (optional — caching disabled if not set)

### 2. Install

```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and MASTER_KEY
```

> **DATABASE_URL** must use the `asyncpg` driver scheme:
> `postgresql+asyncpg://user:password@host:5432/dbname`

> **MASTER_KEY** must match `AI_SERVICE_MASTER_KEY` in the Next.js `.env`.

### 4. Run (development)

```bash
uvicorn main:app --reload --port 8000
```

First run downloads the `all-MiniLM-L6-v2` model (~90MB). Cached to `~/.cache/torch/sentence_transformers/`.

### 5. Run (production via Docker)

```bash
docker build -t evently-ai .
docker run -p 8000:8000 --env-file .env evently-ai
```

---

## API Reference

### Auth

Every endpoint (except `/health`) requires one of:

| Mode | Headers | Used by |
|---|---|---|
| Master JWT | `Authorization: Bearer <jwt>` | Next.js internal calls |
| Tenant key | `X-Tenant-ID: <orgId>` + `X-API-Key: evtly_live_xxx` | Org direct access |

### Tier gates

| Tier | Endpoints |
|---|---|
| FREE | `/health` only (via tenant key) |
| PRO | `/recommend/events/{userId}`, `/recommend/orgs/{orgId}` |
| ENTERPRISE | All above + `/search/semantic` |

### Endpoints

| Method | Path | Tier | Description |
|---|---|---|---|
| `GET` | `/health` | Any | Status check |
| `POST` | `/embed/event` | Master JWT | Store event embedding |
| `POST` | `/embed/org` | Master JWT | Store org embedding |
| `GET` | `/recommend/events/{userId}` | PRO+ | Event recommendations |
| `GET` | `/recommend/orgs/{orgId}` | PRO+ | Org connection recommendations |
| `POST` | `/search/semantic` | ENTERPRISE | Semantic event search |

### Example: Semantic Search

```bash
curl -X POST http://localhost:8000/search/semantic \
  -H "Authorization: Bearer <master_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"query": "AI startup networking Bangalore", "limit": 5}'
```

---

## Architecture Notes

- **Same DB as Next.js** — vector columns (`embedding vector(384)`) on `Events` and `Organization` tables
- **Connection pool capped at 5** — prevents AI service from starving the main app
- **Embeddings async** — triggered via Next.js JobQueue (`EMBED_EVENT`, `EMBED_ORG` job types), not inline on request
- **Cold start fallback** — users with no history get popular events instead of empty recommendations
- **Redis optional** — if `REDIS_URL` is unset, all cache operations are no-ops
