# Task List: LLM and n8n Integration

This document outlines the stepwise implementation of the Large Language Model (LLM) and n8n automation features for the Evently platform.

## Phase 1: Foundation & LLM Infrastructure
*Goal: Enable the AI microservice to communicate with generative models.*

- [ ] **AI Service: Update Dependencies**
    - [ ] Add `openai`, `langchain-core`, `tiktoken` to `ai-service/requirements.txt`.
- [ ] **AI Service: Core Infrastructure**
    - [ ] Create `ai-service/app/llm.py` to wrap LLM API calls.
    - [ ] Update `ai-service/app/config.py` with new keys (`LLM_PROVIDER`, `LLM_API_KEY`, etc.).
    - [ ] Implement health check for LLM connectivity.
- [ ] **Environment Setup**
    - [ ] Configure `.env` in `ai-service/` and the root project.
    - [ ] Obtain and verify API keys (OpenAI or Groq).

## Phase 2: Content Generation & Matchmaking Explanations
*Goal: Deliver immediate value with creative AI assistants.*

- [ ] **AI Service: Generation Endpoints**
    - [ ] Implement `app/routers/generate.py` for event descriptions and match reasoning.
    - [ ] Register router in `main.py`.
- [ ] **Next.js: Service Integration**
    - [ ] Update `lib/ai-service.ts` with `generateEventDescription` and `generateMatchmakingReason`.
    - [ ] Create server actions in `lib/actions/generate.ts`.
- [ ] **Frontend: AI Assistance UI**
    - [ ] Build `AIWriterButton` component and integrate into `EventsForm`.
    - [ ] Update Org Dashboard recommendations to show AI-generated "Why this match?" text.

## Phase 3: Conversational AI & RAG (Chatbot)
*Goal: Provide a stateful AI concierge for events and organizations.*

- [ ] **Database: Chat Persistence**
    - [ ] Update `prisma/schema.prisma` with `ChatSession` and `ChatMessage` models.
    - [ ] Run `npx prisma migrate dev`.
- [ ] **AI Service: RAG Router**
    - [ ] Implement `app/routers/chat.py` with retrieval logic (+ pgvector).
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
- **Phase 1:** 🟦 0/3
- **Phase 2:** 🟦 0/3
- **Phase 3:** 🟦 0/4
- **Phase 4:** 🟦 0/4
- **Phase 5:** 🟦 0/4
