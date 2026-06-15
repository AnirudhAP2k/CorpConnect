# AI Quota-Gated Access — Implementation Plan (Revised)

## Problem Statement

Every method on `aiService` (in `lib/ai-service.ts`) authenticates to the Python AI microservice using a **master JWT** derived from `AI_SERVICE_MASTER_KEY`. The Python AI service (`ai-service/app/middleware/auth.py`) already has a dual-auth system:

1. **Master JWT** (`Authorization: Bearer <token>`) — Used by Next.js. **Bypasses all tier gates and usage limits**.
2. **Tenant Key** (`X-Tenant-ID` + `X-API-Key`) — Used by orgs directly. **Checks tier, verifies `usageCount < usageLimit`, and atomically increments `usageCount`** on `ApiCredential`.

The flaw: **All Next.js AI calls use Mode 1**, so tenant-facing features (recommendations, search, chat, brainstorm, etc.) get free, unmetered access regardless of the org's plan.

## Revised Design

Instead of creating a new `AiUsageLedger` model, we **reuse the existing `ApiCredential`** infrastructure:

1. **Next.js-side quota gate**: Before calling the AI service, check the org's `subscriptionPlan` and `ApiCredential.usageCount` vs `usageLimit`.
2. **After successful AI call**: Atomically increment `ApiCredential.usageCount` on the Next.js side (same table the Python service uses for tenant-key auth).
3. **Master JWT stays**: Internal calls (embed jobs, sentiment analysis) still use master JWT without metering.
4. **No schema migration needed**: `ApiCredential` already has `usageCount`, `usageLimit`, and `tier`.

This means both auth paths (master JWT for Next.js internal, tenant key for direct API consumers) share the same usage counter, giving orgs a unified view of their AI consumption.

---

## Action Classification

### System-Internal (keep master JWT, no metering)

| Method | Reason |
|--------|--------|
| `embedEvent()` | Background job; platform-operated indexing |
| `embedOrg()` | Background job; platform-operated indexing |
| `analyseSentiment()` | Background job; platform-operated feedback analysis |
| `generateEventSummary()` | Background job; enterprise-gated at job level |
| `isAvailable()` | Health check; no AI compute consumed |

### Tenant-Metered (require `orgId`, plan check, usage deduction)

| Method | Min Plan | Notes |
|--------|----------|-------|
| `recommendEvents()` | PRO | Via `useAIFeature` action |
| `recommendOrgs()` | PRO | Via `useAIFeature` action |
| `semanticSearch()` | PRO | Via `useAIFeature` or search route |
| `generateEventDescription()` | PRO | Server action |
| `generateMatchmakingReason()` | PRO | Server action |
| `chat()` | PRO | Server action |
| `getChatHistory()` | PRO | Read-only, no usage deduction |
| `chatBrainstorm()` | ENTERPRISE | API route |
| `chatBrainstormBrief()` | ENTERPRISE | API route |

---

## Implementation Steps

### Step 1: Constants — AI Plan Limits

Add `AI_PLAN_LIMITS` to `constants/index.ts` with per-plan usage caps.

### Step 2: `domain/ai/quota.ts` — Core Quota Logic

Checks `Organization.subscriptionPlan` + `ApiCredential.usageCount/usageLimit`.
Auto-provisions ApiCredential if missing (e.g. for PRO orgs that never generated a key manually).

### Step 3: `domain/ai/actions.ts` — Refactored Server Actions

Migrates from `actions/ai.actions.ts`. Wraps every tenant-facing AI call with quota check + usage deduction.

### Step 4: Refactor API Routes

- `api/ai/search/route.ts` — Add org resolution + quota gate
- `api/ai/recommend/route.ts` — Add org resolution + quota gate
- `api/ai/brainstorm/*/route.ts` — Replace `checkEnterprise` with quota gate

### Step 5: Refactor Domain Queries

- `domain/events/queries.ts` `_getMatchingOrgsAI` — Add org-aware quota gate

### Step 6: Update UI

- `OrgAIPanel.tsx` — Show plan-based limits
- `billing/page.tsx` — Add AI usage progress bar

---

## Migration Checklist

- [ ] Add `AI_PLAN_LIMITS` to `constants/index.ts`
- [ ] Create `domain/ai/quota.ts`
- [ ] Create `domain/ai/types.ts`
- [ ] Create `domain/ai/actions.ts` (migrate from `actions/ai.actions.ts`)
- [ ] Create `domain/ai/index.ts`
- [ ] Update `actions/ai.actions.ts` — backward-compat re-exports from domain
- [ ] Refactor `api/ai/search/route.ts` — add quota gate
- [ ] Refactor `api/ai/recommend/route.ts` — add quota gate
- [ ] Refactor `api/ai/brainstorm/*/route.ts` — replace `checkEnterprise` with quota gate
- [ ] Refactor `sendChatMessage` — add quota gate
- [ ] Refactor `generateEventDescription` — add quota gate
- [ ] Refactor `getMatchmakingReason` — add quota gate
- [ ] Update `domain/events/queries.ts` `_getMatchingOrgsAI` — add quota
- [ ] Update `lib/ai-service.ts` docstring
- [ ] Update `OrgAIPanel.tsx` — plan-based UI
- [ ] Add AI usage card to billing page
- [ ] Verify background jobs are NOT affected
