# CorpConnect Platform - Comprehensive Code Review (Audit Follow-up)

> **Review Date**: July 22, 2026  
> **Reviewer**: AI Code Review Expert  
> **Codebase**: CorpConnect B2B Collaboration Platform  
> **Tech Stack**: Next.js 15, TypeScript, Prisma, PostgreSQL, NextAuth v5, FastAPI (AI), Socket.io (WS), LiveKit (LV)

---

## Executive Summary

CorpConnect continues to mature into a multi-service platform: the Next.js monolith is now accompanied by three microservices (`ai-service` for RAG/LLM, `ws-service` for realtime messaging, `lv-service` for LiveKit video), and the team has made real progress on the Domain-Driven Design migration outlined in the architecture plan. Several long-standing findings from the March 11 review have been **resolved**: true pagination now exists (`getEvents` with `skip`/`take`), the home page is a Server Component with ISR, Sentry is integrated across all tiers, and the `validatedData as any` assertion is gone.

However, the addition of new features (event pitches, AI brainstorm, video rooms, mobile auth) has introduced a **new class of high-severity authorization gaps**. Most notably, the new pitch server actions bind to a **client-supplied user ID** rather than the session, and cross-tenant member mutations are possible because ownership is not bound to the organization. These are P0 blockers that did not exist in the prior review. Testing coverage remains critically low, and `ignoreBuildErrors` still ships type debt to production.

### Overall Assessment vs Previous Review

| Category | Current Rating | Trend | Notes |
|----------|----------------|-------|-------|
| **Architecture** | ⭐⭐⭐⭐☆ | ➡️ | DDD migration real but mid-flight; ~39/68 API routes still call Prisma directly |
| **Security** | ⭐⭐⭐☆☆ | 📉 | New P0 IDOR/authz gaps in pitches & member routes; still no rate limiting |
| **Code Quality** | ⭐⭐⭐☆☆ | ➡️ | `as any` at scale (~168); god components; inconsistent action contracts |
| **Performance** | ⭐⭐⭐⭐☆ | 📈 | Pagination + ISR fixed, strong indexing; capacity/job race conditions remain |
| **Testing** | ⭐⭐☆☆☆ | ➡️ | ~2 real test files vs ~238 sources; AI pytest job runs against zero tests |
| **Production Ready** | ⭐⭐☆☆☆ | ➡️ | Still no `/api/health`, no graceful shutdown, `ignoreBuildErrors` persists |

---

## 🚨 Critical Issues Response (Status Update)

### 1. **TypeScript & ESLint Errors Ignored in Production** - ❌ STILL PRESENT

**Location**: `next.config.ts`

```typescript
typescript: {
  ignoreBuildErrors: true,  // ❌ STILL CRITICAL
},
eslint: {
  ignoreDuringBuilds: true,  // ❌ STILL CRITICAL
},
```

> [!CAUTION]
> Type errors and lint issues still silently pass into production. This is now more concerning given ~168 `as any` usages across `app/` and `components/`, plus `(prisma as any)` workarounds that mask stale generated types (`app/(protected)/organizations/[id]/page.tsx:118`, `lib/jobs/meeting-notification.ts:14`).

### 2. **Component Naming Convention Violation** - ❌ STILL PRESENT

**Location**: `app/(protected)/events/create/page.tsx:7`

```typescript
const page = async () => {  // ❌ Should be PascalCase (e.g., CreateEventPage)
```

Lowercase `const page` persists here; several `components/auth/*` files also remain kebab-case (`back-button.tsx`, `card-wrapper.tsx`, `login-button.tsx`).

### 3. **Unsafe Type Assertions (`validatedData as any`)** - ✅ FIXED

**Location**: `actions/organization.actions.ts`

**Status**: **RESOLVED**. The `validatedData as any` assertion flagged in March is gone; organization mutations now flow through `domain/organizations` with typed inputs. Note that `any` remains widespread *elsewhere* (see Code Quality), but this specific finding is closed.

### 4. **Incomplete Job Processor Implementation** - ⚠️ PARTIALLY RESOLVED

**Location**: `lib/jobs/job-processor.ts`

`SEND_EVENT_REMINDER` and `GENERATE_REPORT` are now implemented (report generation, embedding, sentiment, tasklist jobs all exist and are scheduled). The remaining stub is `PROCESS_REFUND` (`job-processor.ts:168-171`), still a `TODO` for Stripe/Razorpay refund APIs.

### 5. **True Pagination Missing** - ✅ FIXED

**Location**: `data/events.ts` → `domain/events/queries.ts`

**Status**: **RESOLVED**. `getAllEvents` is superseded by `getEvents`, which implements real offset pagination (`skip = (page - 1) * limit`, `take: limit`) wrapped in `unstable_cache` with `["events"]` tags (`domain/events/queries.ts:69-109`).

---

## 🔒 Security & Architecture Updates

Security is the area of **greatest regression** this cycle. New features shipped without consistent session-based authorization.

### 🆕 P0: Pitch Actions Trust Client-Supplied Identity (IDOR)

**Location**: `domain/pitches/actions.ts`

The pitch server actions never call `auth()`. They accept the actor's identity as a **parameter** from the client:

- `createPitchAction` verifies that `data.proposedById` is an org member — but `proposedById` comes from the request body (`components/organizations/PitchBriefModal.tsx:51-53`). A member can create pitches attributed to any other member.
- `submitPitchAction(pitchId, callerUserId)` compares `pitch.proposedById !== callerUserId` where `callerUserId` is client-supplied (`actions.ts:128-136`). Anyone can submit/advance another user's pitch by passing the right ID.
- Review/update paths (`AdminPitchReview.tsx:74`) follow the same pattern.

> [!CAUTION]
> **Fix**: Derive the user ID from `auth()` inside each action and ignore any client-provided `proposedById` / `callerUserId`.

### 🆕 P0: Cross-Tenant Member Mutation

**Location**: `app/api/organizations/[id]/members/[memberId]/route.ts`

The route checks that the requester is an `OWNER` of `organizationId` and fetches `memberToUpdate` by `id`, but **never asserts `memberToUpdate.organizationId === organizationId`** (verified at `route.ts:52-110`). All the business rules (max-5-admins, last-owner protection) are correctly scoped by org, but the target member is not — so an owner of Org A can update/delete a member row belonging to Org B.

> [!CAUTION]
> **Fix**: Add `if (memberToUpdate.organizationId !== organizationId) return 404` before mutating.

### 🆕 P0/P1: Unauthenticated File Upload

**Location**: `actions/upload.actions.ts:47-93`

`uploadFileAction` has **no `auth()` check** and accepts a caller-controlled folder/publicId, uploading directly to Cloudinary. It also allows SVG within the image set (stored-XSS vector if ever served inline). Add a session gate and tighten the MIME allowlist.

### ⚠️ NEW: Missing Rate Limiting - ❌ STILL ABSENT

No rate limiting exists anywhere (no Upstash, no custom limiter). This now exposes not just server actions but `/api/auth/login`, password reset, register, and the AI proxy routes to brute-force and quota-abuse. **Recommendation**: `@upstash/ratelimit` on `/api/auth/*` (P1) and AI/upload endpoints (P2).

### Other notable security findings

| Sev | Finding | Location |
|-----|---------|----------|
| P1 | Event create requires verified org but **no membership** — any user can create events under any verified org | `domain/events/actions.ts:15-41` |
| P1 | Brainstorm/AI quota checked on `organizationId` without membership → cross-tenant quota theft | `app/api/ai/brainstorm/message/route.ts:15-53` |
| P1 | Razorpay webhook HMAC uses non-timing-safe `===` and forgeable when secret empty | `app/api/webhooks/razorpay/route.ts:18-32` |
| P1 | Session-refresh open redirect: `returnTo` has no same-origin allowlist | `app/api/auth/session-refresh/route.ts:32,78` |
| P1 | KYB document list (GET) returns `sourceUrl` without org membership check | `app/api/org-documents/upload/route.ts:95-118` |
| P1 | AI tenant API-key hash mismatch: Next stores SHA256, AI service verifies bcrypt | `domain/api-credentials/actions.ts:17-22` vs `ai-service/app/middleware/auth.py:86-88` |

### ✅ Security strengths maintained

- **No DB calls in middleware** — still relying on JWT claims (`middleware.ts`); short 15m JWT TTL with refresh-token rotation.
- Middleware **strips forged `x-auth-session`** before re-injecting the trusted session (`middleware.ts:45-65`).
- **Stripe webhook signature verification** is correct, and checkout amounts come from DB `event.price` (no client amount tampering).
- Layered AI domain actions (auth → membership → quota → deduct) and master-JWT isolation for the AI service's generative endpoints.
- **No `dangerouslySetInnerHTML`** anywhere; AI/LLM output rendered as escaped React text.

---

## 🏛️ Architecture: DDD Migration Progress

The `/domain` layer is real and is the clear target pattern, but the migration is **mid-flight (~40-60% for core entities)**.

**Migrated (full `actions`/`queries`/`validation`/`types`/`index`)**: `events`, `organizations`, `pitches` (best exemplar), `tags`, `users`. Partial: `auth`, `messaging`, `notifications`, `api-credentials`, `ai` (no `validation.ts`).

**Not yet migrated (direct Prisma in `actions/`)**: `feedback`, `category`, `admin`, `automation`, `event-participation`, `upload`. No `domain/groups`, `domain/billing`, or `domain/feedback`.

**Leakage**: ~39 of ~68 API route files still import `@/lib/db` directly, ~22 protected pages call Prisma inline, and even components (`Navbar.tsx`, `TopHeader.tsx`) query Prisma. The `actions/` + `data/` + `domain/` triple-layer creates import confusion, though explicit re-export bridges (`data/events.ts`, `actions/organization.actions.ts`) document the intended direction well.

---

## 📊 Database & Performance

### ✅ Strengths (improved this cycle)

- **Pagination fixed** (`getEvents` skip/take), **home page is SSR + ISR** (`revalidate = 300`) — both prior findings resolved.
- **49 Prisma models, ~85 indexes**; composite indexes on hot paths (`JobQueue [status, scheduledAt]`, `EventParticipation @@unique([eventId, userId])`).
- **pgvector** embeddings (dim 384) with IVFFlat cosine indexes, managed via raw SQL outside Prisma (`scripts/enable-pgvector.ts`).
- Caching wired through `unstable_cache` + `revalidateTag("events"|"organizations")`.

### ⚠️ Areas for improvement

| Sev | Finding | Location |
|-----|---------|----------|
| P1 | **Event capacity TOCTOU** — `attendeeCount >= max` checked outside the transaction; concurrent joins can oversell seats | `app/api/events/[id]/participate/route.ts:129-164` |
| P1 | **Checkout has no capacity check** — `PENDING_PAYMENT` reservations can exceed capacity | `app/api/events/[id]/checkout/route.ts:77-94` |
| P1 | **Job double-claim** — `findMany` PENDING then `update`, not an atomic conditional claim; multi-instance cron double-processes | `lib/jobs/job-processor.ts:34-61` |
| P2 | **Unbounded `findMany`** on revenue/feedback/groups (no `take`) — memory growth with volume | `data/dashboard.ts:271-279`, `actions/feedback.actions.ts:137-151` |
| P2 | `getEventById` includes **all** participations + full member list into a cached payload — cache bloat | `domain/events/queries.ts:17-41` |
| P2 | Missing FK indexes: `OrganizationMember.organizationId`, `Events.userId`, `Account.userId` | `prisma/schema.prisma` |
| P2 | AI `recommend`/`search`/`embed` calls have **no timeout** — can stall request threads/workers | `lib/ai-service.ts:123-183` |

---

## 🧩 Microservices Review

New surface area since the last review. All three expose `/health`; only the Next.js app does not.

### ai-service (FastAPI, OpenAI-compatible → Groq/OpenAI)
- **New prompts module** (`app/prompts/loader.py` + 9 YAML templates) is a clean refactor: `yaml.safe_load`, `@lru_cache`, Pydantic-validated templates. Routers are properly wired to `load_prompt` with no large leftover inline prompts.
- **P1 reliability bug**: `str.format(**kwargs)` on user/RAG content (`loader.py:25-33`) will raise `KeyError`/`ValueError` if content contains `{...}` braces. Use `string.Template` or brace-escaping.
- **P1**: No timeout/retry on LLM calls; `chat.py`/`generate.py` let LLM exceptions bubble as 500s.
- `python-multipart` unpinned; sync `encode()` inside async embedding route blocks the event loop.

### ws-service (Socket.io + Redis adapter, JWT via `AUTH_SECRET`)
- Good DM participant checks and group membership + ENTERPRISE re-check on send.
- **P1**: `virtual-event.ts:8-47` — `join_virtual_room`/reactions have **no room membership or event access check**; any authenticated user can join any room's presence channel.
- DM handlers lack try/catch (group handlers have it).

### lv-service (Express + LiveKit, JWT via `AUTH_SECRET`)
- Strong `POST /token` gates (room active, event time window, participant/host, paid-event check); host mutations re-verify OWNER/ADMIN via DB.
- **P1**: `GET /rooms` lets any valid internal JWT list rooms for any `eventId` — no participation/host check (`rooms.ts:11-34`).
- All participants get `canPublish: true` (no view-only mode yet).

### Cross-service auth
Next.js is the BFF; services don't call each other. AI service uses a separate `MASTER_KEY` JWT; ws/lv share `AUTH_SECRET` JWTs (5m TTL). Gap: master JWT decode asserts only the signature, and `GET /chat/history/{session_id}` does not check session ownership.

---

## 🧪 Testing

Effectively unchanged and still the weakest category.

- **~2 real test files vs ~238 source files** (`__tests__/sample.test.ts` is a placeholder; `__tests__/users-domain.test.ts` covers two `domain/users` queries).
- Jest coverage config collects `app/`, `components/`, `lib/`, `actions/`, `data/` but **omits `domain/`** — where the only real test lives.
- CI runs `pytest ai-service/ -v` but there are **no pytest files** — the job passes against zero tests.
- **No E2E** (no Playwright/Cypress config).

---

## 🚀 Production Readiness Gaps

1. **Missing Health Check**: Still no `/api/health` in the Next.js app (the three microservices have one). Compose defines healthchecks only for `db` and `redis`, not the app services.
2. **No Graceful Shutdown**: No `SIGTERM` handling anywhere in TS/JS; Prisma has no `$disconnect` on exit; `node-cron` scheduler is not drained. (The AI service does close its DB pool via FastAPI lifespan.)
3. **No boot-time env validation**: No zod/t3-env schema; `.env.example` is incomplete vs `compose.yaml` (missing `REDIS_URL`, LiveKit keys, several n8n vars) and `JOB_TRIGGER_SECRET`.
4. **Observability half-wired**: Sentry is integrated (server/edge/client + AI service), but the file logger is commented out and Prometheus/Grafana remain stubbed in `compose.yaml`.
5. **CI blind spots**: Path filters omit `actions/`, `data/`, `__tests__/`; the release pipeline (`release.yml`) runs typecheck + build but **skips tests and lint**.
6. **Docker**: Main Next.js image is multi-stage + non-root (good); the three microservice images run as **root** and define no image/compose healthchecks. n8n has a weak default password (`changeme`).

---

## 📋 Updated Action Items (July Priority List)

### 🔴 P0 (Blockers — Security)
1. **Bind pitch actions to `auth()`** — ignore client `proposedById`/`callerUserId` (`domain/pitches/actions.ts`).
2. **Scope member mutations to the org** — assert `memberToUpdate.organizationId === organizationId` (`members/[memberId]/route.ts`).
3. **Add auth to `uploadFileAction`** and tighten MIME (drop/raw-serve SVG) (`actions/upload.actions.ts`).

### 🟠 P1 (High)
1. Add **membership checks** to `createEventAction`, brainstorm AI routes, `getOrganizationEvents`, and org-documents GET.
2. **Rate limiting** on `/api/auth/*` (and AI/upload).
3. Fix **Razorpay webhook** (timing-safe compare, fail-closed on empty secret) and **session-refresh open redirect** (same-origin allowlist).
4. Wrap **event capacity** checks in an atomic transaction/conditional update; add **atomic job claim** (`updateMany where status=PENDING`).
5. Fix AI **prompt `str.format` crash** on brace-containing content; add **LLM timeouts/retries**.
6. Align **API-key hashing** (SHA256 vs bcrypt) between Next.js and the AI service.
7. Add authz to **ws virtual-room** and **lv `GET /rooms`**.

### 🟡 P2 (Medium)
1. **Remove `ignoreBuildErrors` / `ignoreDuringBuilds`** and burn down `any` usage; fix `(prisma as any)` type-sync issues.
2. Add **`/api/health`** and app-service healthchecks in compose; run microservice images as **non-root**.
3. Add **graceful SIGTERM** shutdown (Prisma disconnect, cron drain).
4. Add **pagination/limits** to unbounded `findMany` (dashboard revenue, feedback, groups).
5. **Missing FK indexes**: `OrganizationMember.organizationId`, `Events.userId`, `Account.userId`.
6. Standardize the **server-action result contract** (`{ success, data | error }` as in `domain/pitches`).
7. Add **boot-time env validation** and complete `.env.example`.
8. Establish a **real test baseline** (add pytest tests so the CI job is meaningful; include `domain/` in coverage; begin E2E).

### 🟢 P3 (Low)
1. Rename lowercase `const page` components and kebab-case `components/auth/*`.
2. Split god components (`EventsForm` ~516, `OrgVerificationDetail` ~487, `PitchDetailView` ~448, `OrganizationForm` ~428).
3. Fix silent/console-only error UX (`NotificationBell.tsx:83`, `BrainstormChat.tsx:116-118`, `ConnectButton`).
4. Repo hygiene: remove/gitignore `backup/*.sql`, empty `brain/` and `artifacts/` folders.

---

## Summary of Trend vs March 11

**Resolved**: true pagination, home-page SSR/ISR, `validatedData as any`, most job processor TODOs, Sentry integration.
**Regressed**: security (new P0 IDOR/authz gaps from pitch, member, and upload features).
**Unchanged**: `ignoreBuildErrors`, no rate limiting, no `/api/health`, no graceful shutdown, minimal test coverage, `const page` naming.

The platform's architecture and performance are trending up as the DDD migration and caching strategy mature. The priority now is closing the **new authorization holes** introduced alongside the pitch/AI/video features before any production deployment.

---

*Review completed by AI Code Review Expert on July 22, 2026*
