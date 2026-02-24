# Phase 7: AI Microservice — Walkthrough

## What Was Built

A complete Python/FastAPI AI microservice integrated into the Evently monorepo, with multi-tenant auth, embedding-based recommendations, and semantic search.

---

## 1. Database Changes

### Schema (`prisma/schema.prisma`)

| Change | Details |
|---|---|
| `ApiCredential` model | Tenant auth table: `tenantId`, `apiKey` (bcrypt hash), `apiKeyPrefix`, `tier`, `usageCount`, `usageLimit` |
| `ApiTier` enum | `FREE` / `PRO` / `ENTERPRISE` |
| `JobType` additions | `EMBED_EVENT`, `EMBED_ORG` |
| `Organization.apiCredential` | One-to-one relation |

`prisma db push` applied cleanly — `ApiCredential` table created in production DB.

### pgvector Setup Script

[scripts/enable-pgvector.ts](file:///d:/evently/scripts/enable-pgvector.ts) — run once:
```bash
npx ts-node scripts/enable-pgvector.ts
```
Adds `embedding vector(384)` columns to `Events` and `Organization`, and creates IVFFlat cosine-similarity indexes.

---

## 2. Python AI Service (`ai-service/`)

```
ai-service/
├── main.py                      # FastAPI lifespan, CORS, router wiring
├── requirements.txt             # Pinned deps (FastAPI, asyncpg, sentence-transformers…)
├── .env.example                 # Config template
├── Dockerfile                   # Pre-downloads model at build time
├── README.md                    # Setup + API reference
└── app/
    ├── config.py                # Pydantic Settings
    ├── database.py              # asyncpg pool (max 5 conn), pgvector helpers
    ├── embeddings.py            # all-MiniLM-L6-v2 singleton + taste-profile builder
    ├── cache.py                 # Redis w/ graceful no-op fallback
    ├── middleware/auth.py       # Dual-mode auth: master JWT + tenant bcrypt key
    └── routers/
        ├── embed.py             # POST /embed/event, POST /embed/org
        ├── recommend.py         # GET /recommend/events/{userId}, GET /recommend/orgs/{orgId}
        └── search.py            # POST /search/semantic
```

### Auth Middleware

```
Request → Master JWT? → ENTERPRISE tier access (internal Next.js calls)
       → X-Tenant-ID + X-API-Key? → bcrypt verify → load tier → gate → track usage
       → 401 Unauthorized
```

### Tier Gates

| Endpoint | FREE | PRO | ENTERPRISE |
|---|---|---|---|
| `GET /health` | ✅ | ✅ | ✅ |
| `POST /embed/*` | master JWT only | ✅ | ✅ |
| `GET /recommend/events/{userId}` | ❌ | ✅ | ✅ |
| `GET /recommend/orgs/{orgId}` | ❌ | ✅ | ✅ |
| `POST /search/semantic` | ❌ | ❌ | ✅ |

### Recommendation Logic

- **Events**: Builds weighted-average taste-profile from user's participation + view history (ATTENDED=1.0, REGISTERED=0.7, viewed>60s=0.5). Cold-start → returns popular events.
- **Orgs**: Cosine similarity + OrgInteraction graph boost (Phase 5 data). Up to +0.15 score boost for orgs with shared event history.
- **Semantic search**: Minimum score threshold 0.3 filters irrelevant results.

---

## 3. Next.js Integration

### New Files

| File | Purpose |
|---|---|
| [lib/ai-service.ts](file:///d:/evently/lib/ai-service.ts) | Typed HTTP client — master JWT auth, 5s timeout, graceful empty-array fallback |
| [app/api/ai/recommend/route.ts](file:///d:/evently/app/api/ai/recommend/route.ts) | `GET ?type=events\|orgs` — session-auth proxy |
| [app/api/ai/search/route.ts](file:///d:/evently/app/api/ai/search/route.ts) | `POST { query }` — semantic search proxy |
| [app/api/organizations/[id]/api-credentials/route.ts](file:///d:/evently/app/api/organizations/%5Bid%5D/api-credentials/route.ts) | OWNER-only key management (GET/POST/DELETE) |
| [scripts/enable-pgvector.ts](file:///d:/evently/scripts/enable-pgvector.ts) | One-time pgvector setup |

### Modified Files

| File | Change |
|---|---|
| [app/api/events/route.ts](file:///d:/evently/app/api/events/route.ts) | Enqueues `EMBED_EVENT` job after event create |
| [app/api/organizations/[id]/route.ts](file:///d:/evently/app/api/organizations/%5Bid%5D/route.ts) | Enqueues `EMBED_ORG` job after org create + update |

### API Key Lifecycle

```
OWNER → POST /api/organizations/{id}/api-credentials
     ← { tenantId, apiKey: "evtly_live_...", warning: "Save this key..." }

Next time:
     → GET /api/organizations/{id}/api-credentials
     ← { tenantId, apiKeyPrefix: "evtly_live_xxx", tier, usageCount, usageLimit }
```

Key is bcrypt-hashed in DB and **never retrievable** after generation.

---

## 4. Environment Variables Required

```bash
# .env (Next.js)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_MASTER_KEY=<long random secret>

# ai-service/.env
DATABASE_URL=postgresql+asyncpg://...
MASTER_KEY=<same secret as above>
MODEL_NAME=all-MiniLM-L6-v2
REDIS_URL=   # optional
```

---

## 5. How to Run the AI Service

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env          # fill DATABASE_URL + MASTER_KEY
uvicorn main:app --reload --port 8000
```

First start downloads `all-MiniLM-L6-v2` (~90MB). Subsequent starts are ~2s.

**Health check:**
```bash
curl http://localhost:8000/health
# {"status":"ok","model":"all-MiniLM-L6-v2","version":"1.0.0"}
```

---

## 6. Verification Checklist

- [x] `prisma db push` — `ApiCredential` table created
- [x] `prisma generate` — client updated with `EMBED_EVENT`, `EMBED_ORG`, `apiCredential`
- [x] `tsc --noEmit` — zero Phase 7 type errors (pre-existing unrelated errors unchanged)
- [x] `activeOrganizationId` type error fixed via DB lookup instead of session
- [ ] `npx ts-node scripts/enable-pgvector.ts` — run once when pgvector is available on Render
- [ ] AI service first start — model download + `/health` returns `ok`
- [ ] Create event → `EMBED_EVENT` row appears in `JobQueue`
- [ ] `POST /api/organizations/{id}/api-credentials` → receives `evtly_live_` key
