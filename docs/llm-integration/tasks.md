# Task List: LLM and n8n Integration

This document outlines the stepwise implementation of the Large Language Model (LLM) and n8n automation features for the Evently platform.

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

- [ ] **Infrastructure: Deployment**
    - [ ] Add `n8n` service to `compose.yaml`.
    - [ ] Secure communication with HMAC/Secret headers.
- [ ] **Database: Automation Rules**
    - [ ] Update `prisma/schema.prisma` with `AutomationRule` model.
    - [ ] Add `TRIGGER_N8N_WORKFLOW` to `JobType`.
- [ ] **Next.js: Orchestration**
    - [ ] Implement `lib/actions/automation.ts`.
    - [ ] Create API route `app/api/webhooks/event-registration/route.ts` as a trigger source.
- [ ] **Frontend: Automation UI**
    - [ ] Build `AutomationRulesPanel` for organizers.
    - [ ] Implement rule management (Create/Toggle/Test).

## Progress Summary
- **Phase 1:** ✅ Complete
- **Phase 2:** ✅ Complete
- **Phase 3:** ✅ Complete
- **Phase 4:** ✅ Complete
- **Phase 5:** 🟦 Not started
