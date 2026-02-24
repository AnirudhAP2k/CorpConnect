# Phase 7: AI Microservice Integration

## Background

A Python/FastAPI AI service in `ai-service/` (monorepo subfolder), sharing the same PostgreSQL DB with pgvector for vector storage. Multi-tenant authentication modelled after Firebase/Microsoft Graph — each organization gets a `tenantId` + `apiKey` pair, with tier-gated access.

## Architecture

```
evently/ (Next.js)                         ai-service/ (Python/FastAPI)
├── lib/ai-service.ts  ─── HTTPS ────────► ├── main.py
├── app/api/ai/                             ├── app/
│   ├── recommend/route.ts (proxy)         │   ├── middleware/auth.py   ← tenant validation
│   └── search/route.ts    (proxy)         │   ├── routers/
├── .env                                   │   │   ├── embed.py
│   AI_SERVICE_URL=http://localhost:8000   │   │   ├── recommend.py
│   AI_SERVICE_MASTER_KEY=...             │   │   └── search.py
└── JobQueue                               │   ├── embeddings.py        ← SentenceTransformer
    EMBED_EVENT / EMBED_ORG               │   ├── database.py          ← pgvector + asyncpg
                                           │   └── cache.py             ← Redis (optional)
                    ┌──────────────────────┴────────────────────────────┐
                    │   PostgreSQL (same DB)                             │
                    │   Events.embedding  vector(384)                    │
                    │   Organization.embedding  vector(384)              │
                    │   ApiCredential  (tenant auth table)              │
                    └───────────────────────────────────────────────────┘
```

**Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` — 384 dims, ~90MB, CPU-friendly, free forever.

---

## Proposed Changes

---

### 1. Database: New Table + pgvector Columns

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

Add `ApiCredential` model and new `JobType` values:

```prisma
model ApiCredential {
  id           String          @id @default(uuid()) @db.Uuid
  organizationId String        @unique @db.Uuid
  tenantId     String          @unique @db.Uuid  // = organizationId, exposed publicly
  apiKey       String          @unique            // hashed (bcrypt)
  apiKeyPrefix String                             // first 12 chars, shown in UI: "evtly_live_xxx..."
  tier         ApiTier         @default(FREE)
  usageCount   Int             @default(0)
  usageLimit   Int             @default(100)      // per billing period
  lastUsedAt   DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  organization Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([apiKeyPrefix])
}

enum ApiTier {
  FREE          // No AI features
  PRO           // Event + org recommendations
  ENTERPRISE    // Full: recommendations + semantic search + analytics
}
```

Add to `JobType` enum:
```diff
+ EMBED_EVENT
+ EMBED_ORG
```

#### [NEW] [scripts/enable-pgvector.ts](file:///d:/evently/scripts/enable-pgvector.ts)

One-time setup script — enables pgvector extension and adds `embedding vector(384)` columns + IVFFlat indexes:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "Events"       ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX ON "Events"       USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON "Organization" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Run once: `npx ts-node scripts/enable-pgvector.ts`

---

### 2. Python AI Service (`ai-service/`)

#### Directory Structure
```
ai-service/
├── main.py                    # FastAPI app, CORS, middleware wiring
├── requirements.txt           # Pinned dependencies
├── .env.example               # DATABASE_URL, API_KEY, MODEL_NAME, REDIS_URL
├── Dockerfile                 # Production container
├── README.md                  # Setup guide + endpoint docs
└── app/
    ├── config.py              # Pydantic Settings (reads .env)
    ├── database.py            # asyncpg pool + pgvector raw SQL helpers
    ├── embeddings.py          # SentenceTransformer model singleton + encode()
    ├── cache.py               # Redis cache (TTL helpers, graceful no-op if unavailable)
    ├── middleware/
    │   └── auth.py            # Tenant auth: validates X-Tenant-ID + X-API-Key or master JWT
    └── routers/
        ├── embed.py           # POST /embed/event, POST /embed/org
        ├── recommend.py       # GET  /recommend/events/{userId}, GET /recommend/orgs/{orgId}
        └── search.py          # POST /search/semantic
```

#### Dependencies (`requirements.txt`)
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
asyncpg==0.29.0
pgvector==0.3.2
sentence-transformers==3.0.1
pydantic-settings==2.3.0
python-jose[cryptography]==3.3.0  # JWT verification (master key)
bcrypt==4.1.3                     # API key hashing
redis[asyncio]==5.0.7
httpx==0.27.0
```

#### Auth Middleware Design

Every request (except `/health`) must present one of:

| Mode | Headers | Who uses it |
|---|---|---|
| Tenant key | `X-Tenant-ID: <orgId>` + `X-API-Key: evtly_live_xxx` | External / org direct calls |
| Master JWT | `Authorization: Bearer <jwt>` | Next.js internal calls |

Middleware flow:
1. Check for master JWT → verify with `AI_SERVICE_MASTER_KEY` → allow all tiers
2. Else check `X-Tenant-ID` + `X-API-Key` → hash key, compare with DB → load tier
3. Check tier gate for requested endpoint
4. Increment `usageCount`, check against `usageLimit`
5. Reject with `402 Payment Required` if over limit

#### Tier Gates

| Endpoint | FREE | PRO | ENTERPRISE |
|---|---|---|---|
| `GET /health` | ✅ | ✅ | ✅ |
| `POST /embed/*` | ✅ (internal only) | ✅ | ✅ |
| `GET /recommend/events/{userId}` | ❌ | ✅ | ✅ |
| `GET /recommend/orgs/{orgId}` | ❌ | ✅ | ✅ |
| `POST /search/semantic` | ❌ | ❌ | ✅ |

#### Recommendation Logic

**Events for user:**
1. Load user's participation history + view history (from DB)
2. Weighted-average their event embeddings (attended=1.0, viewed w/ duration>60s=0.5, browsed=0.2)
3. Cosine similarity against all upcoming public events
4. Filter out already joined events
5. Boost events from same industry as user's primary org
6. Return top-N with similarity scores

**Orgs for org:**
1. Load requesting org's embedding
2. Cosine similarity against all other orgs
3. Boost by OrgInteraction count (Phase 5 graph data)
4. Filter out already-connected orgs
5. Return top-N

---

### 3. Next.js Integration

#### [NEW] [lib/ai-service.ts](file:///d:/evently/lib/ai-service.ts)

Typed HTTP client. **Fails gracefully** — if AI service is unreachable, all methods return empty arrays (no 500 errors surfaced to users).

```typescript
export interface AIRecommendedEvent { eventId: string; score: number; reason: string }
export interface AIRecommendedOrg   { orgId: string;   score: number; sharedInterests: string[] }
export interface AISearchResult     { eventId: string; score: number; snippet: string }

export const aiService = {
  recommendEvents(userId: string, limit?: number): Promise<AIRecommendedEvent[]>
  recommendOrgs(orgId: string, limit?: number):    Promise<AIRecommendedOrg[]>
  semanticSearch(query: string, limit?: number):   Promise<AISearchResult[]>
  embedEvent(eventId: string, text: string):       Promise<void>
  embedOrg(orgId: string, text: string):           Promise<void>
}
```

Uses `AI_SERVICE_MASTER_KEY` JWT for auth (bypasses tenant tier checks).

#### [NEW] [app/api/ai/recommend/route.ts](file:///d:/evently/app/api/ai/recommend/route.ts)
`GET /api/ai/recommend?type=events|orgs` — session-authenticated proxy to AI service.

#### [NEW] [app/api/ai/search/route.ts](file:///d:/evently/app/api/ai/search/route.ts)
`POST /api/ai/search` `{ query: string }` — semantic search proxy.

#### [MODIFY] Event create/update routes
After successful create/update, enqueue `EMBED_EVENT` job via existing JobQueue.

#### [MODIFY] Organization create/update routes
After successful create/update, enqueue `EMBED_ORG` job via existing JobQueue.

#### [NEW] [app/api/organizations/[id]/api-credentials/route.ts](file:///d:/evently/app/api/organizations/[id]/api-credentials/route.ts)
- `GET` — fetch credential info for org (prefix only, never full key)
- `POST` — generate new API key (OWNER only), returns full key once
- `DELETE` — revoke key

#### [MODIFY] [app/(protected)/organizations/[id]/dashboard/page.tsx](file:///d:/evently/app/(protected)/organizations/[id]/dashboard/page.tsx)
Add **"AI & API"** section:
- Current tier badge (FREE/PRO/ENTERPRISE)
- API key display (`evtly_live_xxx...` masked) + Copy + Regenerate
- Usage meter (usageCount / usageLimit)
- Upgrade CTA for FREE tier

#### [MODIFY] [app/(protected)/dashboard/page.tsx](file:///d:/evently/app/(protected)/dashboard/page.tsx)
Replace Phase 4 `getRecommendedEvents()` with `/api/ai/recommend?type=events`. Fallback to existing logic if AI service unavailable.

#### [MODIFY] [app/(protected)/events/page.tsx](file:///d:/evently/app/(protected)/events/page.tsx)
Add semantic search toggle. When enabled, routes through `/api/ai/search` instead of DB keyword search.

---

### 4. Environment Variables

```bash
# .env (Next.js)
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_MASTER_KEY=super-secret-jwt-signing-key   # shared secret for JWT

# ai-service/.env
DATABASE_URL=postgresql+asyncpg://user:pass@host/db
MASTER_KEY=super-secret-jwt-signing-key              # same as above
MODEL_NAME=all-MiniLM-L6-v2
REDIS_URL=redis://localhost:6379                      # optional
```

---

## Verification Plan

### Python service
```bash
cd ai-service
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Health check
curl http://localhost:8000/health
# → { "status": "ok", "model": "all-MiniLM-L6-v2", "version": "1.0.0" }

# Embed an event (master JWT)
curl -X POST http://localhost:8000/embed/event \
  -H "Authorization: Bearer <jwt>" \
  -d '{"eventId": "...", "text": "AI summit for startups in Bangalore..."}'

# Get recommendations
curl http://localhost:8000/recommend/events/<userId> \
  -H "Authorization: Bearer <jwt>"
```

### Next.js side
```bash
npx ts-node scripts/enable-pgvector.ts   # one-time: enable pgvector
npx prisma db push                        # add ApiCredential table
npx tsc --noEmit                          # zero new errors

# Generate org API key → confirm evtly_live_ prefix returned
# Create event → confirm EMBED_EVENT job in JobQueue
# GET /api/ai/recommend?type=events → returns AI-ranked events
# POST /api/ai/search { "query": "..." } → returns semantic results
```

> [!NOTE]
> pgvector must be enabled on your Render PostgreSQL instance. Render supports it natively — the script handles it with `CREATE EXTENSION IF NOT EXISTS vector`.

> [!IMPORTANT]
> The model (~90MB) downloads automatically on first `uvicorn` start. Subsequent starts use the local cache (~2s warm-up).
