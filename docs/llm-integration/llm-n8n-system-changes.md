# Required System Changes — LLM & n8n Integration

> Based on: `docs/llm-integration-suggestions.md`
> Analysed: `ai-service/`, `lib/ai-service.ts`, `lib/actions/`, `prisma/schema.prisma`, `lib/jobs/`, `compose.yaml`

---

## Overview

The current AI stack is a **retrieval-only** system: `all-MiniLM-L6-v2` generates vector embeddings, and the Python FastAPI service (`ai-service/`) handles semantic search and recommendations via pgvector. The following changes extend it with:

1. **LLM (Generative AI)** — for RAG chatbot, content generation, sentiment analysis, and matchmaking explanations.
2. **n8n** — for agentic, event-driven automation workflows triggered by Evently.

The changes span **5 layers**: AI Microservice, Database (Prisma), Next.js Backend, Next.js Frontend, and Infrastructure.

---

## Layer 1: AI Microservice (`ai-service/`)

This is the most significant change area. The Python FastAPI service needs to grow from a pure embedding engine into a full AI service.

### 1.1 New Dependencies (`requirements.txt`)

```diff
+ openai==1.35.0          # or: groq==0.9.0 for Llama/Mistral via Groq API
+ langchain-core==0.2.0   # optional: for RAG pipeline chaining
+ tiktoken==0.7.0         # token counting for prompts
```

**Choice:** Use **OpenAI (`gpt-4o-mini`)** or **Groq (`llama-3.1-8b-instant`)** as the LLM backend. Groq is free-tier and extremely fast; OpenAI has higher reasoning quality. The LLM client is isolated so it can be swapped easily.

### 1.2 New Config (`app/config.py`)

Add three new environment variables to `Settings`:

```diff
+ LLM_PROVIDER: str = "openai"         # "openai" | "groq"
+ LLM_API_KEY: str = ""                # OpenAI or Groq API key
+ LLM_MODEL_NAME: str = "gpt-4o-mini"  # or "llama-3.1-8b-instant"
+ N8N_WEBHOOK_SECRET: str = ""         # Shared secret for n8n webhook calls
```

### 1.3 New Module: `app/llm.py`

A new file that initialises and wraps the LLM client. Keeps the LLM provider swappable.

```python
# app/llm.py
from openai import AsyncOpenAI
from app.config import settings

_client: AsyncOpenAI | None = None

def get_llm_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE_URL if settings.LLM_PROVIDER == "groq" else None,
        )
    return _client

async def generate(system_prompt: str, user_message: str) -> str:
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=settings.LLM_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        temperature=0.4,
        max_tokens=800,
    )
    return response.choices[0].message.content or ""
```

### 1.4 New Routers

| New File | Endpoint | Feature |
|---|---|---|
| `app/routers/chat.py` | `POST /chat/event/{eventId}` | RAG event chatbot |
| `app/routers/chat.py` | `POST /chat/org/{orgId}` | RAG org assistant |
| `app/routers/generate.py` | `POST /generate/event-description` | AI content writer |
| `app/routers/generate.py` | `POST /generate/matchmaking-reason` | Explain org/event match |
| `app/routers/analyse.py` | `POST /analyse/sentiment` | Sentiment analysis on feedback text |
| `app/routers/webhooks.py` | `POST /webhooks/n8n` | Receive callbacks from n8n (HMAC signed) |

**RAG flow for `/chat/event/{eventId}`:**
1. Receive user question.
2. Call `embeddings.py` → generate embedding of the question.
3. Query `pgvector` for top-3 similar event content chunks (existing DB).
4. Feed retrieved context + question into `llm.generate()`.
5. Return the structured LLM response.

### 1.5 `main.py` Updates

Register the three new routers:

```diff
- from app.routers import embed, recommend, search
+ from app.routers import embed, recommend, search, chat, generate, analyse, webhooks

- app.include_router(embed.router,     prefix="/embed",     tags=["Embeddings"])
- app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])
- app.include_router(search.router,    prefix="/search",    tags=["Search"])
+ app.include_router(embed.router,     prefix="/embed",     tags=["Embeddings"])
+ app.include_router(recommend.router, prefix="/recommend", tags=["Recommendations"])
+ app.include_router(search.router,    prefix="/search",    tags=["Search"])
+ app.include_router(chat.router,      prefix="/chat",      tags=["Chat / RAG"])
+ app.include_router(generate.router,  prefix="/generate",  tags=["Content Generation"])
+ app.include_router(analyse.router,   prefix="/analyse",   tags=["Analysis"])
+ app.include_router(webhooks.router,  prefix="/webhooks",  tags=["n8n Webhooks"])
```

---

## Layer 2: Database / Prisma (`prisma/schema.prisma`)

### 2.1 Chat History Table (New Model)

To support a stateful chatbot with conversation memory, store chat sessions:

```prisma
model ChatSession {
  id        String        @id @default(uuid()) @db.Uuid
  userId    String        @db.Uuid
  contextId String        @db.Uuid  // eventId or orgId being discussed
  contextType ChatContextType
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  messages  ChatMessage[]
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ChatMessage {
  id        String      @id @default(uuid()) @db.Uuid
  sessionId String      @db.Uuid
  role      ChatRole    // USER | ASSISTANT
  content   String
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

enum ChatRole {
  USER
  ASSISTANT
}

enum ChatContextType {
  EVENT
  ORG
}
```

### 2.2 Event Feedback Table (New Model)

Required for sentiment analysis. Feedback is collected post-event:

```prisma
model EventFeedback {
  id        String   @id @default(uuid()) @db.Uuid
  eventId   String   @db.Uuid
  userId    String   @db.Uuid
  rating    Int      // 1-5
  comment   String?
  sentiment String?  // Populated by AI: "positive" | "neutral" | "negative"
  createdAt DateTime @default(now())
  event     Events   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([eventId])
}
```

### 2.3 n8n Automation Rules Table (New Model)

Allows organizers to define natural-language automation triggers:

```prisma
model AutomationRule {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @db.Uuid
  name           String
  triggerType    String   // e.g. "EVENT_REGISTRATION", "MEETING_ACCEPTED"
  promptTemplate String   // Natural language instruction for the AI agent
  n8nWebhookUrl  String   // Target n8n webhook URL for this rule
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, triggerType])
}
```

### 2.4 New JobType Enum Values

Add new background job types to the existing `JobType` enum:

```diff
enum JobType {
  // ... existing values
+ ANALYSE_FEEDBACK_SENTIMENT
+ TRIGGER_N8N_WORKFLOW
+ GENERATE_MATCHMAKING_REASON
}
```

---

## Layer 3: Next.js Backend (`lib/`)

### 3.1 Extend `lib/ai-service.ts`

Add typed methods for every new AI microservice endpoint:

```typescript
// New interface types to add:
export interface AIChatResponse {
    answer:  string;
    sources: string[];  // event/org IDs used as RAG context
}

export interface AIGeneratedDescription {
    description: string;
    suggestions: string[];
}

export interface AISentimentReport {
    overallSentiment: "positive" | "neutral" | "negative";
    score: number; // 0-1
    summary: string;
    keyThemes: string[];
}

// New methods on the aiService object:
aiService.chatWithEvent(eventId, question, sessionId?)
aiService.chatWithOrg(orgId, question, sessionId?)
aiService.generateEventDescription(roughDraft)
aiService.generateMatchmakingReason(orgId, targetOrgId)
aiService.analyseFeedbackSentiment(eventId, feedbackTexts[])
```

### 3.2 New Server Actions (`lib/actions/`)

| New File | Actions |
|---|---|
| `lib/actions/chat.ts` | `sendChatMessage(contextId, contextType, message)` |
| `lib/actions/feedback.ts` | `submitEventFeedback(eventId, rating, comment)`, `getEventSentimentReport(eventId)` |
| `lib/actions/generate.ts` | `generateEventDescription(roughDraft)`, `getMatchmakingReason(orgId, targetOrgId)` |
| `lib/actions/automation.ts` | `createAutomationRule(...)`, `listAutomationRules(orgId)`, `toggleRule(ruleId)` |

### 3.3 New API Routes (`app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `app/api/ai/chat/route.ts` | `POST` | Proxy secure chat calls to the AI service |
| `app/api/feedback/route.ts` | `POST` | Submit event feedback |
| `app/api/n8n/callback/route.ts` | `POST` | Receive completion callbacks from n8n (HMAC validated) |
| `app/api/webhooks/event-registration/route.ts` | `POST` | Trigger n8n workflows on event registration |

### 3.4 Job Runner — New Handlers (`lib/jobs/`)

The existing job runner needs to handle the three new `JobType` values:

```typescript
// In the existing job processor:
case "ANALYSE_FEEDBACK_SENTIMENT":
    await aiService.analyseFeedbackSentiment(payload.eventId, payload.texts);
    break;
case "TRIGGER_N8N_WORKFLOW":
    await fetch(payload.webhookUrl, { method: "POST", body: JSON.stringify(payload.data), ... });
    break;
case "GENERATE_MATCHMAKING_REASON":
    const reason = await aiService.generateMatchmakingReason(payload.orgId, payload.targetOrgId);
    // store reason in DB
    break;
```

---

## Layer 4: Next.js Frontend (`components/`, `app/`)

### 4.1 AI Chat Widget (New Component)

A floating chat panel that can be embedded in event pages and org dashboards.

- **Component:** `components/ai/ChatWidget.tsx`
- **Placement:** `app/(protected)/events/[id]/page.tsx` and `app/(protected)/organizations/[id]/dashboard/page.tsx`
- **Behaviour:** Stateful, with session history stored in the DB via server actions.

### 4.2 AI Writer Button (New Component)

A button placed adjacent to the `description` field in the event creation form.

- **Component:** `components/ai/AIWriterButton.tsx`
- **Placement:** Inside `EventsForm` component, next to the description textarea.
- **Behaviour:** Submits the draft text → receives generated description → populates the textarea.

### 4.3 Sentiment Dashboard (New Panel)

An org dashboard panel that shows aggregated post-event sentiment using charts.

- **Component:** `components/organizations/SentimentPanel.tsx`
- **Placement:** In the org dashboard beside existing `OrgAIPanel.tsx`.
- **Behaviour:** Fetches from `getEventSentimentReport()` action and renders a summary with a score badge.

### 4.4 Matchmaking Reason Chips (Enhancement)

Update the existing org recommendations list to show an AI-generated reason beneath each recommendation card.

- **File to update:** The component currently rendering org recommendations in the dashboard.
- **Change:** Add a `"Why this match?"` expandable section that calls `getMatchmakingReason()`.

### 4.5 Automation Rules Manager (New Page / Panel)

A UI for organizers (ADMIN/OWNER role only) to define and manage n8n automation rules.

- **Component:** `components/organizations/AutomationRulesPanel.tsx`
- **Placement:** New tab or section in the org dashboard.
- **Behaviour:** `CREATE / LIST / TOGGLE / DELETE` automation rules backed by the `AutomationRule` model.

### 4.6 Event Feedback Form (New Component)

A form available to event participants after the event ends.

- **Component:** `components/events/FeedbackForm.tsx`
- **Placement:** `app/(protected)/events/[id]/page.tsx`, visible only after `endDateTime` has passed for registered attendees.

---

## Layer 5: Infrastructure (`compose.yaml`, `.env`)

### 5.1 `compose.yaml` — Add n8n Service

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

### 5.2 Environment Variables — Summary of New Additions

**`ai-service/.env`:**
```env
LLM_PROVIDER=groq                          # or "openai"
LLM_API_KEY=gsk_...                        # Groq or OpenAI key
LLM_MODEL_NAME=llama-3.1-8b-instant             # or "gpt-4o-mini"
N8N_WEBHOOK_SECRET=<random-32-char-string>
```

**`.env` (Next.js root):**
```env
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=<same-as-above>
```

---

## Summary: Change Impact at a Glance

| Layer | Files to Create | Files to Modify |
|---|---|---|
| **AI Microservice** | `app/llm.py`, `app/routers/chat.py`, `app/routers/generate.py`, `app/routers/analyse.py`, `app/routers/webhooks.py` | `main.py`, `app/config.py`, `requirements.txt` |
| **Database** | — | `prisma/schema.prisma` (3 new models, 1 enum update + migration) |
| **Next.js Backend** | `lib/actions/chat.ts`, `lib/actions/feedback.ts`, `lib/actions/generate.ts`, `lib/actions/automation.ts`, `app/api/ai/chat/route.ts`, `app/api/feedback/route.ts`, `app/api/n8n/callback/route.ts` | `lib/ai-service.ts`, `lib/jobs/` (new handlers) |
| **Next.js Frontend** | `components/ai/ChatWidget.tsx`, `components/ai/AIWriterButton.tsx`, `components/organizations/SentimentPanel.tsx`, `components/organizations/AutomationRulesPanel.tsx`, `components/events/FeedbackForm.tsx` | `EventsForm`, org dashboard page |
| **Infrastructure** | — | `compose.yaml`, `ai-service/.env`, `.env` |

---

## Recommended Rollout Order

1. **Phase 1 (Foundation):** Layer 1 (LLM module + config) + Layer 5 (env vars) → no DB or UI changes yet.
2. **Phase 2 (Content Gen & Matchmaking):** AI Writer button + Matchmaking Reason (no new DB models needed).
3. **Phase 3 (Chat / RAG):** Chat history DB models + Chat Widget component.
4. **Phase 4 (Sentiment):** Feedback model + Feedback Form + Sentiment Panel.
5. **Phase 5 (n8n Agentic):** AutomationRule model + n8n compose service + Automation Rules Manager UI.
