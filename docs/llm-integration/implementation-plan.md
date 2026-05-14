# Implementation Plan: LLM & n8n Integration

> **Source Tasks:** `docs/llm-integration/tasks.md`
> **System Changes Reference:** `docs/llm-integration/llm-n8n-system-changes.md`
> **Last Updated:** 2026-03-20

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│                    Next.js App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  UI Components│  │Server Actions│  │  API Routes  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         └──────────────────┴──────────────────┘         │
│                            │                            │
│                     lib/ai-service.ts                   │
└────────────────────────────┬───────────────────────────┘
                             │ HTTP (JWT)
           ┌─────────────────▼──────────────────┐
           │        FastAPI AI Microservice       │
           │                                      │
           │  ┌────────┐  ┌────────┐  ┌────────┐ │
           │  │ /embed │  │/search │  │/chat   │ │
           │  │ /embed │  │/recomm.│  │/generate│ │
           │  └────────┘  └────────┘  │/analyse│ │
           │                          │/webhook│ │
           │  ┌──────────────────┐    └────────┘ │
           │  │  all-MiniLM-L6-v2│  ┌──────────┐ │
           │  │  (Embeddings)    │  │ LLM API  │ │
           │  └──────────────────┘  │ (GPT/Groq│ │
           │                        └──────────┘ │
           └──────────────┬─────────────────────┘
                          │
         ┌────────────────▼──────────────────┐
         │     PostgreSQL + pgvector          │
         │  Events · Orgs · OrgDocuments     │
         │  ChatSessions · Feedback · Rules  │
         └───────────────────────────────────┘
                          │
         ┌────────────────▼──────────────────┐
         │          n8n (Automation)          │
         │  Webhook triggers → Agent LLM →   │
         │  Email / Slack / 3rd-Party APIs   │
         └───────────────────────────────────┘
```

---

## Phase 1: Foundation & LLM Infrastructure

**Goal:** Enable the AI microservice to communicate with a generative LLM and establish a universal document store for RAG context.

### Step 1.1 — Update AI Service Dependencies

**File:** `ai-service/requirements.txt`

Add the following packages:

```diff
+ openai==1.35.0          # Unified client for OpenAI and Groq APIs
+ langchain-core==0.2.0   # RAG pipeline utilities
+ tiktoken==0.7.0         # Token counting for safe prompt construction
+ pypdf==4.2.0            # PDF parsing for document ingestion
```

> **Provider Decision:** Use **Groq** (`llama-3.1-8b-instant`) for development (free, fast). Switch to **OpenAI** (`gpt-4o-mini`) for production for higher quality.

---

### Step 1.2 — Extend AI Service Config

**File:** `ai-service/app/config.py`

Add the following settings to the `Settings` class:

```python
# LLM provider settings
LLM_PROVIDER: str = "groq"               # "openai" | "groq"
LLM_API_KEY: str = ""                    # Groq or OpenAI API key
LLM_MODEL_NAME: str = "llama-3.1-8b-instant" # or "gpt-4o-mini"

# n8n integration
N8N_WEBHOOK_SECRET: str = ""            # HMAC signing secret
```

---

### Step 1.3 — Create the LLM Client Module

**New File:** `ai-service/app/llm.py`

This module wraps the LLM provider behind a single async interface. The provider can be swapped by changing the env config — no other code changes required.

```python
from openai import AsyncOpenAI
from app.config import settings

_client: AsyncOpenAI | None = None

def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=(
                "https://api.groq.com/openai/v1"
                if settings.LLM_PROVIDER == "groq"
                else None
            ),
        )
    return _client

async def generate(system_prompt: str, user_message: str, max_tokens: int = 800) -> str:
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=settings.LLM_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.4,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""
```

---

### Step 1.4 — Add Health Check for LLM

**File:** `ai-service/main.py`

Extend the existing `/health` endpoint to also report LLM availability:

```python
@app.get("/health", tags=["Health"])
async def health():
    llm_ok = bool(settings.LLM_API_KEY)
    return {
        "status": "ok",
        "model": settings.MODEL_NAME,
        "llm_provider": settings.LLM_PROVIDER if llm_ok else "not configured",
        "llm_ready": llm_ok,
        "version": settings.SERVICE_VERSION,
    }
```

---

### Step 1.5 — Database: Universal Document Store

**File:** `prisma/schema.prisma`

Add the `OrgDocument` model. This is the cornerstone of RAG — it stores chunked text from company descriptions, event details, and legal/compliance documents, each with a vector embedding for retrieval.

```prisma
model OrgDocument {
  id             String                      @id @default(uuid()) @db.Uuid
  organizationId String?                     @db.Uuid       // null = platform-wide doc
  docType        OrgDocumentType
  title          String
  content        String                      // Raw text chunk
  sourceUrl      String?                     // Optional link to original file
  embedding      Unsupported("vector(1536)")?
  createdAt      DateTime                    @default(now())
  updatedAt      DateTime                    @updatedAt
  organization   Organization?               @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([docType])
}

enum OrgDocumentType {
  COMPANY_DESCRIPTION   // Organization bio and mission
  EVENT_DESCRIPTION     // Event-specific details, FAQs
  LEGAL_COMPLIANCE      // Terms, policies, compliance docs
  GENERAL               // Any additional reference material
}
```

Run the migration:
```bash
npx prisma migrate dev --name add_org_document_and_rag_models
```

---

### Step 1.6 — AI Service: Document Ingestion Backend

**New File:** `ai-service/app/routers/ingest.py`

This router handles uploading and chunking documents; the chunks are embedded using `all-MiniLM-L6-v2` and stored in the `OrgDocument` table.

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| `POST` | `/ingest/text` | Ingest a plain text or Markdown document |
| `POST` | `/ingest/pdf` | Parse and ingest a PDF file |
| `DELETE` | `/ingest/{docId}` | Remove a document and its embedding |

**Chunking Strategy:**
- Split text into 512-token chunks with a 64-token overlap to preserve context across chunk boundaries.
- Each chunk is stored as a separate `OrgDocument` row with its own embedding.

---

### Step 1.7 — Environment Variables

**`ai-service/.env`:**
```env
LLM_PROVIDER=groq
LLM_API_KEY=gsk_...
LLM_MODEL_NAME=llama-3.1-8b-instant
N8N_WEBHOOK_SECRET=<random-32-char-string>
```

**`.env` (Next.js root):**
```env
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=<same-secret>
```

---

## Phase 2: Content Generation & Matchmaking Explanations

**Goal:** Use RAG over organizational documents and event data to generate context-aware content and explain AI match scores.

### Step 2.1 — AI Service: RAG-Enhanced Generation Router

**New File:** `ai-service/app/routers/generate.py`

**RAG Generation Flow:**
```
User Draft Text
      │
      ▼
Embed the draft using MiniLM
      │
      ▼
Retrieve top-K chunks from OrgDocument table
(filter by organizationId + docType IN [COMPANY_DESCRIPTION, LEGAL_COMPLIANCE])
      │
      ▼
Build prompt: system=compliance+brand context, user=draft
      │
      ▼
LLM generates polished description respecting brand/legal guidelines
      │
      ▼
Return generated text + sources used
```

**Endpoints:**

| Method | Path | Request Body | Response |
|---|---|---|---|
| `POST` | `/generate/event-description` | `{ orgId, roughDraft, eventId? }` | `{ description, suggestions, sourceDocs }` |
| `POST` | `/generate/matchmaking-reason` | `{ sourceOrgId, targetOrgId, score }` | `{ reason, sharedThemes }` |

**Matchmaking Reason RAG Flow:**
- Retrieve `COMPANY_DESCRIPTION` chunks for both the source and target org.
- Feed both summaries + similarity score to the LLM.
- LLM generates a 2–3 sentence "why this match" explanation grounded in their actual descriptions.

Register in `main.py`:
```python
from app.routers import generate, ingest
app.include_router(generate.router, prefix="/generate", tags=["Content Generation"])
app.include_router(ingest.router,   prefix="/ingest",   tags=["Document Ingestion"])
```

---

### Step 2.2 — Next.js: ai-service.ts Extensions

**File:** `lib/ai-service.ts`

Add the following types and methods:

```typescript
export interface AIGeneratedContent {
    description: string;
    suggestions: string[];
    sourceDocs: string[];
}

export interface AIMatchmakingReason {
    reason: string;
    sharedThemes: string[];
}

// Add to aiService object:
async generateEventDescription(orgId: string, roughDraft: string): Promise<AIGeneratedContent>
async generateMatchmakingReason(sourceOrgId: string, targetOrgId: string, score: number): Promise<AIMatchmakingReason>
```

---

### Step 2.3 — Next.js: Server Actions

**New File:** `lib/actions/generate.ts`

```typescript
"use server";
// generateEventDescription(orgId, roughDraft) → calls aiService, returns result
// getMatchmakingReason(sourceOrgId, targetOrgId) → calls aiService, caches result via JobQueue
```

---

### Step 2.4 — Frontend: AI Writer Button

**New Component:** `components/ai/AIWriterButton.tsx`

- Rendered inside `EventsForm` (and `OrgProfile` edit form), next to the `description` textarea.
- On click: sends the current draft text + `orgId` to the `generateEventDescription` action.
- Shows a loading spinner while the LLM responds.
- On success: populates the textarea with the generated description and shows a dismissible diff of changes.

---

### Step 2.5 — Frontend: Matchmaking Reason Display

**File to update:** The component displaying org recommendations in the dashboard.

- Add a collapsible `"Why this match?"` accordion under each recommendation card.
- On first expand: calls `getMatchmakingReason()` action and renders the explanation.
- Results are cached on the client so subsequent expands don't re-query.

---

## Phase 3: Conversational AI & RAG (Chatbot)

**Goal:** Provide a stateful AI concierge grounded in event details, organization bio, and platform-level compliance documents.

### Step 3.1 — Database: Chat Persistence

**File:** `prisma/schema.prisma`

```prisma
model ChatSession {
  id          String          @id @default(uuid()) @db.Uuid
  userId      String          @db.Uuid
  contextId   String          @db.Uuid    // eventId or orgId
  contextType ChatContextType
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  messages    ChatMessage[]
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, contextId])
}

model ChatMessage {
  id        String      @id @default(uuid()) @db.Uuid
  sessionId String      @db.Uuid
  role      ChatRole
  content   String
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum ChatRole        { USER  ASSISTANT }
enum ChatContextType { EVENT ORG       }
```

Run the migration:
```bash
npx prisma migrate dev --name add_chat_session_models
```

---

### Step 3.2 — AI Service: Multi-Context RAG Router

**New File:** `ai-service/app/routers/chat.py`

**Multi-Context RAG Retrieval Strategy:**

When a user asks a question:
1. Embed the user question using `all-MiniLM-L6-v2`.
2. Run **three parallel** pgvector similarity searches:
   - **Context A:** Event-specific `OrgDocument` rows (`docType = EVENT_DESCRIPTION`, filtered to the active eventId).
   - **Context B:** Company-level `OrgDocument` rows (`docType = COMPANY_DESCRIPTION`, filtered to the hosting orgId).
   - **Context C:** Platform-wide compliance docs (`docType = LEGAL_COMPLIANCE`, `organizationId IS NULL`).
3. Merge and re-rank retrieved chunks by score; take top-5.
4. Build a structured prompt:
   ```
   You are an intelligent assistant for the Evently platform.
   Use the following retrieved context to answer the user's question accurately.
   Do not invent facts not present in the context.

   [CONTEXT A — Event Details]
   ...

   [CONTEXT B — Organization Info]
   ...

   [CONTEXT C — Platform Policies]
   ...

   [USER QUESTION]
   ...
   ```
5. Pass to `llm.generate()` and return the answer with source references.

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat/event/{eventId}` | Chatbot grounded in event + org + compliance docs |
| `POST` | `/chat/org/{orgId}` | Chatbot grounded in org bio + compliance docs |

**Request Body:**
```json
{ "question": "Are there vegetarian meal options at this event?", "sessionId": "uuid?" }
```

---

### Step 3.3 — Next.js: Chat Backend

**New File:** `lib/actions/chat.ts`

```typescript
"use server";
// createChatSession(userId, contextId, contextType) → returns sessionId
// sendChatMessage(sessionId, message)               → returns AI answer + saves to DB
// getChatHistory(sessionId)                          → returns ChatMessage[]
```

**New API Route:** `app/api/ai/chat/route.ts`
- Accepts streaming responses for real-time token display.
- Validates user is authenticated and quota is not exceeded before proxying to AI service.

---

### Step 3.4 — Frontend: Chat Widget

**New Component:** `components/ai/ChatWidget.tsx`

- Floating panel with a chat bubble trigger.
- Renders message history with `USER` and `ASSISTANT` roles styled differently.
- Supports streaming responses (token-by-token display).
- Embedded on:
  - `app/(protected)/events/[id]/page.tsx`
  - `app/(protected)/organizations/[id]/dashboard/page.tsx`

---

## Phase 4: Sentiment Analysis & Feedback Loop

**Goal:** Collect post-event feedback, extract AI-powered insights, and surface them to organizers.

### Step 4.1 — Database: Feedback Schema

**File:** `prisma/schema.prisma`

```prisma
model EventFeedback {
  id        String   @id @default(uuid()) @db.Uuid
  eventId   String   @db.Uuid
  userId    String   @db.Uuid
  rating    Int      // 1–5 stars
  comment   String?
  sentiment String?  // "positive" | "neutral" | "negative" — populated async by AI
  createdAt DateTime @default(now())
  event     Events   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId])
}
```

Add job types to the `JobType` enum:
```diff
+ ANALYSE_FEEDBACK_SENTIMENT
+ GENERATE_MATCHMAKING_REASON
```

Run the migration:
```bash
npx prisma migrate dev --name add_event_feedback
```

---

### Step 4.2 — AI Service: Sentiment Analysis Router

**New File:** `ai-service/app/routers/analyse.py`

**Endpoint:** `POST /analyse/sentiment`

**Request Body:**
```json
{ "eventId": "uuid", "texts": ["Great event!", "Venue was too hot.", "..."] }
```

**LLM Prompt Strategy:**
- Analyse each comment individually for label and score.
- Aggregate to produce a structured report with key positive and negative themes.

**Response:**
```json
{
  "overallSentiment": "positive",
  "score": 0.78,
  "summary": "Attendees rated the speakers highly but flagged parking issues.",
  "keyPositiveThemes": ["speakers", "networking"],
  "keyNegativeThemes": ["parking", "venue temperature"]
}
```

---

### Step 4.3 — Next.js: Feedback Pipeline

**New File:** `lib/actions/feedback.ts`

```typescript
"use server";
// submitEventFeedback(eventId, rating, comment)
//  → saves EventFeedback to DB
//  → enqueues ANALYSE_FEEDBACK_SENTIMENT job

// getEventSentimentReport(eventId)
//  → aggregates sentiment from all EventFeedback rows for the event
//  → returns structured SentimentReport
```

**Job Runner Update** (`lib/jobs/`):
```typescript
case "ANALYSE_FEEDBACK_SENTIMENT":
    const feedbacks = await prisma.eventFeedback.findMany({ where: { eventId: payload.eventId } });
    const report = await aiService.analyseFeedbackSentiment(payload.eventId, feedbacks.map(f => f.comment));
    // Update each EventFeedback.sentiment field in DB
    break;
```

---

### Step 4.4 — Frontend: Feedback UI

**New Component:** `components/events/FeedbackForm.tsx`
- A 5-star rating field + optional comment textarea.
- Shown only to registered attendees after `event.endDateTime` has passed.
- Submits via `submitEventFeedback` server action.

**New Component:** `components/organizations/SentimentPanel.tsx`
- Rendered in Org Dashboard beside `OrgAIPanel.tsx`.
- Displays a donut chart (positive/neutral/negative ratios) and the LLM-generated summary text.
- Expandable list of key positive and negative themes.

---

## Phase 5: Agentic Workflows with n8n

**Goal:** Transform the platform into an event co-pilot by allowing organizers to define natural-language automation rules executed by an autonomous AI agent.

### Step 5.1 — Infrastructure: Deploy n8n

**File:** `compose.yaml`

```yaml
n8n:
  image: n8nio/n8n:latest
  restart: unless-stopped
  ports:
    - "5678:5678"
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_USER}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    - WEBHOOK_URL=http://n8n:5678
  volumes:
    - n8n_data:/home/node/.n8n
  networks:
    - evently_net

volumes:
  n8n_data:
```

**Security:** All Evently → n8n calls include a `X-Evently-Signature` HMAC header. All n8n → Evently callback calls are validated using the same `N8N_WEBHOOK_SECRET`.

---

### Step 5.2 — Database: Automation Rules

**File:** `prisma/schema.prisma`

```prisma
model AutomationRule {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @db.Uuid
  name           String
  triggerType    String       // "EVENT_REGISTRATION" | "MEETING_ACCEPTED" | "FEEDBACK_SUBMITTED"
  promptTemplate String       // Natural language task for the AI agent in n8n
  n8nWebhookUrl  String       // The target n8n webhook that handles this rule
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, triggerType])
}
```

Add job type:
```diff
+ TRIGGER_N8N_WORKFLOW
```

Run the migration:
```bash
npx prisma migrate dev --name add_automation_rules
```

---

### Step 5.3 — Next.js: Automation Orchestration

**New File:** `lib/actions/automation.ts`
```typescript
"use server";
// createAutomationRule(orgId, name, triggerType, promptTemplate, n8nWebhookUrl)
// listAutomationRules(orgId)
// toggleAutomationRule(ruleId, isActive)
// deleteAutomationRule(ruleId)
```

**Trigger Points** (enqueue `TRIGGER_N8N_WORKFLOW` job when these events fire):

| Platform Event | Trigger Type |
|---|---|
| User registers for event | `EVENT_REGISTRATION` |
| Meeting request accepted | `MEETING_ACCEPTED` |
| Event feedback submitted | `FEEDBACK_SUBMITTED` |
| Connection request accepted | `CONNECTION_ACCEPTED` |

**New API Route:** `app/api/n8n/callback/route.ts`
- Receives `POST` callbacks from n8n on workflow completion/failure.
- Validates HMAC signature before processing.
- Updates job status in DB.

**Job Runner Update:**
```typescript
case "TRIGGER_N8N_WORKFLOW":
    const rules = await prisma.automationRule.findMany({
        where: { organizationId: payload.orgId, triggerType: payload.triggerType, isActive: true }
    });
    for (const rule of rules) {
        await fetch(rule.n8nWebhookUrl, {
            method: "POST",
            headers: { "X-Evently-Signature": computeHmac(payload), "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, promptTemplate: rule.promptTemplate }),
        });
    }
    break;
```

---

### Step 5.4 — AI Service: n8n Webhook Router

**New File:** `ai-service/app/routers/webhooks.py`

Receives POST callbacks from n8n when an agentic workflow needs AI inference mid-execution (e.g., to generate a custom email body or evaluate a condition using the LLM).

**Endpoint:** `POST /webhooks/n8n`

Validates the `X-Evently-Signature` header before processing.

---

### Step 5.5 — Frontend: Automation Rules Manager

**New Component:** `components/organizations/AutomationRulesPanel.tsx`

Features:
- Available only to members with `OWNER` or `ADMIN` role.
- List view of all automation rules with active/inactive toggle.
- "Create Rule" form: select a `triggerType`, write a natural language `promptTemplate`, and provide the `n8nWebhookUrl`.
- "Test" button: fires a dry-run to verify the n8n webhook is reachable.

---

## File Creation Checklist

### AI Microservice (`ai-service/`)
| File | Action |
|---|---|
| `requirements.txt` | Modify — add `openai`, `langchain-core`, `tiktoken`, `pypdf` |
| `app/config.py` | Modify — add LLM and n8n settings |
| `app/llm.py` | **Create** |
| `app/routers/ingest.py` | **Create** |
| `app/routers/generate.py` | **Create** |
| `app/routers/chat.py` | **Create** |
| `app/routers/analyse.py` | **Create** |
| `app/routers/webhooks.py` | **Create** |
| `main.py` | Modify — register new routers + update health check |

### Database
| File | Action |
|---|---|
| `prisma/schema.prisma` | Modify — add `OrgDocument`, `ChatSession`, `ChatMessage`, `EventFeedback`, `AutomationRule` models and new enum values |

### Next.js Backend (`lib/`)
| File | Action |
|---|---|
| `lib/ai-service.ts` | Modify — add new typed methods |
| `lib/actions/generate.ts` | **Create** |
| `lib/actions/chat.ts` | **Create** |
| `lib/actions/feedback.ts` | **Create** |
| `lib/actions/automation.ts` | **Create** |
| `lib/jobs/` (processor) | Modify — add new job type handlers |
| `app/api/ai/chat/route.ts` | **Create** |
| `app/api/feedback/route.ts` | **Create** |
| `app/api/n8n/callback/route.ts` | **Create** |

### Next.js Frontend (`components/`)
| File | Action |
|---|---|
| `components/ai/ChatWidget.tsx` | **Create** |
| `components/ai/AIWriterButton.tsx` | **Create** |
| `components/organizations/SentimentPanel.tsx` | **Create** |
| `components/organizations/AutomationRulesPanel.tsx` | **Create** |
| `components/events/FeedbackForm.tsx` | **Create** |

### Infrastructure
| File | Action |
|---|---|
| `compose.yaml` | Modify — add n8n service |
| `ai-service/.env` | Modify — add LLM and n8n env vars |
| `.env` | Modify — add n8n env vars |
