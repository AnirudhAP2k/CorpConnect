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

- [ ] **Database: Chat Persistence**
    - [ ] Update `prisma/schema.prisma` with `ChatSession` and `ChatMessage` models.
    - [ ] Run `npx prisma migrate dev`.
- [ ] **AI Service: Multi-Context RAG Router**
    - [ ] Implement `app/routers/chat.py` with cross-context retrieval (Event items + Org Bio + Global Legal/Compliance docs).
- [ ] **Next.js: Chat Backend**
    - [ ] Implement `lib/actions/chat.ts` for managing sessions and sending messages.
- [ ] **Frontend: Chat Interface**
    - [ ] Build `ChatWidget.tsx` floating component.
    - [ ] Embed widget on Event and Organization pages.

## Phase 4: Sentiment Analysis & Feedback Loop
*Goal: Provide actionable insights to organizers.*

- [ ] **Database: Feedback Schema**
    - [ ] Update `prisma/schema.prisma` with `EventFeedback` model.
    - [ ] Add `ANALYSE_FEEDBACK_SENTIMENT` to `JobType`.
- [ ] **AI Service: Analysis Router**
    - [ ] Implement `app/routers/analyse.py` for sentiment extraction.
- [ ] **Next.js: Feedback System**
    - [ ] Create `lib/actions/feedback.ts`.
    - [ ] Update job runner to handle asynchronous sentiment analysis tasks.
- [ ] **Frontend: Reporting UI**
    - [ ] Build `FeedbackForm` for attendees.
    - [ ] Create `SentimentPanel` charts for the Organization Dashboard.

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
- **Phase 1:** 🟦 0/5
- **Phase 2:** 🟦 0/3
- **Phase 3:** 🟦 0/4
- **Phase 4:** 🟦 0/4
- **Phase 5:** 🟦 0/4
