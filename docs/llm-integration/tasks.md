# Task List: LLM and n8n Integration

This document outlines the stepwise implementation of the Large Language Model (LLM) and n8n automation features for the CorpConnect platform.

## Phase 1: Foundation & LLM Infrastructure
*Goal: Enable the AI microservice to communicate with generative models.*

- [x] **AI Service: Update Dependencies**
    - [x] Add `openai`, `langchain-core`, `tiktoken`, `pypdf` to `ai-service/requirements.txt`.
- [x] **AI Service: Core Infrastructure**
    - [x] Create `ai-service/app/llm.py` to wrap LLM API calls.
    - [x] Update `ai-service/app/config.py` with new keys (`LLM_PROVIDER`, `LLM_API_KEY`, etc.).
    - [x] Implement health check for LLM connectivity.
- [x] **Environment Setup**
    - [x] Configure `.env` in `ai-service/` and the root project.
    - [ ] Obtain and verify API keys (OpenAI or Groq) — **ACTION REQUIRED: add `LLM_API_KEY` to `ai-service/.env`**.
- [x] **Database: Universal Document Embedding**
    - [x] Update `prisma/schema.prisma` with `OrgDocument` model and `OrgDocumentType` enum.
    - [x] Run `npx prisma db push` — schema synced successfully ✅
- [x] **AI Service: Document Ingestion Backend**
    - [x] Implement `app/routers/ingest.py` — chunking + embedding logic for Text, Markdown, and PDF files.

## Phase 2: Content Generation & Matchmaking Explanations
*Goal: Deliver immediate value with creative AI assistants.*

- [x] **AI Service: RAG-Enhanced Generation**
    - [x] Implement `app/routers/generate.py` with 3-layer RAG (brand docs + legal docs + event docs).
    - [x] Implement `require_master_jwt` dependency + tier gates for new endpoints in `auth.py`.
    - [x] Register `/generate` router in `main.py`.
- [x] **Next.js: Service Integration**
    - [x] Update `lib/ai-service.ts` with `generateEventDescription` and `generateMatchmakingReason` + types.
    - [x] Create server actions in `lib/actions/generate.ts` (auth + org membership gated).
- [x] **Frontend: Context-Aware UI**
    - [x] Built `components/ai/AIWriterButton.tsx` — draft expansion panel with source doc badges, suggestions accordion, accept/regenerate/discard actions.
    - [x] Integrated `AIWriterButton` into `EventsForm.tsx` on the description field.
    - [x] Fixed pre-existing `OrgAIPanel.tsx` TypeScript error.

## Phase 3: Conversational AI & RAG (Chatbot)
*Goal: Provide a stateful AI concierge for events and organizations.*

- [x] **Database: Chat Persistence**
    - [x] Added `ChatSession` + `ChatMessage` models + `ChatContextType` + `ChatRole` enums to `schema.prisma`.
    - [x] Ran `npx prisma db push` — tables created and Prisma Client regenerated.
- [x] **AI Service: Multi-Context RAG Router**
    - [x] Implemented `app/routers/chat.py` — session upsert, 10-message rolling history, 3 parallel RAG retrievals (event/org/legal), LLM call, dual-message DB persist.
    - [x] Registered `/chat` router in `main.py`.
- [x] **Next.js: Chat Backend**
    - [x] Extended `lib/ai-service.ts` with `AIChatRequest`, `AIChatResponse`, `AIChatHistoryMessage` types + `chat()` and `getChatHistory()` methods.
    - [x] Created `lib/actions/chat.ts` — `sendChatMessage`, `getChatHistory`, `getExistingSession` server actions (auth + access gated).
- [x] **Frontend: Chat Interface**
    - [x] Built `components/ai/ChatWidget.tsx` — floating FAB → 480px slide-up panel, user/assistant bubbles, typing indicator, source doc badges, session resume on reopen.
    - [x] Embedded widget on Event detail page (`app/(protected)/events/[id]/page.tsx`).
    - [x] Embedded widget on Org dashboard page (`app/(protected)/organizations/[id]/dashboard/page.tsx`).

## Phase 4: Sentiment Analysis & Feedback Loop
*Goal: Provide actionable insights to organizers.*

- [x] **Database: Feedback Schema**
    - [x] Update `prisma/schema.prisma` with `EventFeedback` model + `FeedbackSentiment` enum.
    - [x] `ANALYSE_FEEDBACK_SENTIMENT` already existed in `JobType` — confirmed ✅
    - [x] Ran `npx prisma db push` — table created, Prisma Client regenerated.
- [x] **AI Service: Analysis Router**
    - [x] Implemented `app/routers/analyse.py` — few-shot LLM prompt, structured JSON output, rating-based fallback.
    - [x] Registered `/analyse` router in `main.py`.
- [x] **Next.js: Feedback System**
    - [x] Extended `lib/ai-service.ts` with `AISentimentRequest`, `AISentimentResult` types + `analyseSentiment()` method.
    - [x] Created `lib/jobs/sentiment-analysis.ts` — job handler with idempotency guard.
    - [x] Updated `lib/jobs/job-processor.ts` — added `ANALYSE_FEEDBACK_SENTIMENT` case.
    - [x] Created `lib/actions/feedback.ts` — `submitFeedback`, `getUserFeedback`, `getEventFeedbackSummary`, `getOrgFeedbackSummary` server actions (auth + participation gated).
- [x] **Frontend: Reporting UI**
    - [x] Built `components/feedback/FeedbackForm.tsx` — star picker, text area, char counter, thank-you state.
    - [x] Built `components/feedback/FeedbackButton.tsx` — Sheet trigger wrapping FeedbackForm.
    - [x] Built `components/feedback/SentimentPanel.tsx` — recharts donut + bar charts, theme badges, recent comments.
    - [x] Embedded `FeedbackButton` on Event detail page (registered, non-cancelled attendees only).
    - [x] Embedded `SentimentPanel` on Org Dashboard (between OrgAIPanel and OrgConnectionsPanel).

## Phase 5: Agentic Workflows with n8n
*Goal: Empower users with autonomous automations.*

- [x] **Infrastructure: Deployment**
    - [x] Added `n8n` service to `compose.yaml` (self-hosted, reuses Postgres under `n8n` schema, basic-auth, persistent volume).
    - [x] HMAC-SHA256 signing via `N8N_SHARED_SECRET`; separate `N8N_CALLBACK_SECRET` for callback route.
- [x] **Database: Automation Rules**
    - [x] Added `AutomationRule` model to `prisma/schema.prisma` with `AutomationTrigger` and `AutomationStatus` enums.
    - [x] `TRIGGER_N8N_WORKFLOW` was already in `JobType` — confirmed ✅
    - [x] Ran `npx prisma db push` — table created, Prisma Client regenerated cleanly.
- [x] **Backend: Job Handler + Trigger System**
    - [x] Created `lib/jobs/automation.ts` — `enqueueMatchingRules()` helper (fire-and-forget, never throws).
    - [x] Created `lib/jobs/n8n-trigger.ts` — HMAC signing, 10s timeout, run stats update, re-throw on failure.
    - [x] Updated `lib/jobs/job-processor.ts` — added `TRIGGER_N8N_WORKFLOW` case.
    - [x] Created `lib/actions/automation.ts` — `createAutomationRule`, `listAutomationRules`, `toggleAutomationRule`, `deleteAutomationRule`, `testAutomationRule`.
    - [x] Created `app/api/webhooks/n8n-callback/route.ts` — validates `X-Callback-Secret`, updates `lastRunAt`/`lastRunStatus`.
- [x] **Trigger Instrumentation (6 points)**
    - [x] `EVENT_REGISTRATION` — `app/api/events/[id]/participate/route.ts` (POST)
    - [x] `FEEDBACK_RECEIVED` — `lib/actions/feedback.ts` (`submitFeedback`)
    - [x] `CONNECTION_ACCEPTED` — `app/api/organizations/[id]/connections/[connectionId]/route.ts` (PATCH)
    - [x] `MEETING_SCHEDULED` — `app/api/events/[id]/meeting-requests/[requestId]/route.ts` (PATCH)
    - [x] `NEW_MEMBER_JOINED` — `app/api/invitations/[id]/accept/route.ts` (POST)
    - [ ] `EVENT_CANCELLED` — deferred (no cancel endpoint currently exists; add when event cancellation is built)
- [x] **Frontend: Rule Management UI**
    - [x] Built `components/automation/AutomationRulesPanel.tsx` — rule list with status dots, trigger badges, run stats, hover actions (test/toggle/delete), empty state, toast notifications.
    - [x] Built `components/automation/AddRuleSheet.tsx` — right-side Sheet with name, trigger dropdown, `https://` webhook URL input, description, live payload preview.
    - [x] Embedded `AutomationRulesPanel` on Org Dashboard (below SentimentPanel).

## Phase 5b: Agentic LLM Automation
*Goal: Complete the agentic layer — `promptTemplate`, runtime gaps, sample workflows, optional ai-service inference.*

> See [n8n-agentic-implementation-plan.md](./n8n-agentic-implementation-plan.md) for full spec.

### Workstream A — Agent instructions (`promptTemplate`)
- [x] A1. Schema: `promptTemplate String? @db.Text` on `AutomationRule`
- [x] A1. Prisma migration: `add_automation_rule_prompt_template`
- [x] A2. Validation: `promptTemplate` in `CreateRuleSchema` (max 2000)
- [x] A2. Actions: persist/list/test `promptTemplate` in `automation.actions.ts`
- [x] A3. UI: textarea in `AddRuleSheet.tsx`, truncated display in `AutomationRulesPanel.tsx`
- [x] A4. Payload: `promptTemplate` in `N8nJobPayload`, enqueue, and n8n-trigger POST body

### Workstream B — Runtime gap fixes
- [x] B1. `EVENT_CANCELLED` producer in `domain/events/actions.ts` (`deleteEventAction`)
- [x] B2. `filterJson` matching in `enqueueMatchingRules` (equality + comparison operators)
- [x] B3. Env naming: `.env.example` → `N8N_SHARED_SECRET` / `N8N_CALLBACK_SECRET`; ai-service config alias
- [x] B4. Security: HTTPS enforcement + hostname-only logging in `n8n-trigger.ts`

### Workstream C — Agentic path + ai-service
- [x] C1+C2. Ops runbook: `docs/llm-integration/n8n-workflows/README.md`
- [x] C2. Sample workflow: `registration-ops-agent.json`
- [x] C3. ai-service: `POST /webhooks/n8n` (HMAC-authed LLM inference for n8n)
- [x] C3. Router registered in `main.py`; `/webhooks` tier gate added

### Workstream D — Docs & tracking
- [x] D. Phase 5b checklist added to this file
- [x] D. Cross-link added to `phase5-implementation-plan.md`

## Phase 5c: Seeded workflow catalog (template dropdown)
- [x] `AutomationWorkflowTemplate` model + `AutomationRule.templateId` FK + migration
- [x] `promptTemplate` column included in same migration
- [x] Seed templates in `prisma/seed.ts`
- [x] Resolve webhook/prompt from template in `lib/jobs/n8n-trigger.ts`
- [x] Org UI: template dropdown in `AddRuleSheet` (custom URL advanced)
- [x] App admin UI: `/admin/automations` to edit template webhook URLs
- [x] Docs updated for catalog ops model

## Progress Summary
- **Phase 1:** ✅ Complete
- **Phase 2:** ✅ Complete
- **Phase 3:** ✅ Complete
- **Phase 4:** ✅ Complete
- **Phase 5:** ✅ Complete
- **Phase 5b:** ✅ Complete
- **Phase 5c:** ✅ Complete (catalog templates)
- **Phase 5b:** ✅ Complete
