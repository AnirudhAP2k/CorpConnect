# Phase 3 Implementation Plan — Conversational AI & RAG Chatbot

> **Goal:** Give every user a stateful AI concierge that can answer questions
> about any **Event** or **Organization** page, grounded in the org's documents,
> event details, and platform-wide compliance docs via multi-context RAG.

---

## Architecture Overview

```
Browser (ChatWidget)
    │  sendChatMessage() server action
    ▼
lib/actions/chat.ts  (session management, auth, access check)
    │  POST /chat/message  (internal, Master JWT)
    ▼
ai-service/app/routers/chat.py
    │  1. Resolve / create ChatSession in DB
    │  2. Load last 10 ChatMessages (short-term memory)
    │  3. Embed user query → pgvector (3 parallel RAG queries)
    │      ├─ OrgDocument [EVENT_DESCRIPTION]    (event FAQs)
    │      ├─ OrgDocument [COMPANY_DESCRIPTION]  (org bio/mission)
    │      └─ OrgDocument [LEGAL_COMPLIANCE]     (platform policies)
    │  4. Build grounded system prompt + history
    │  5. Call LLM
    │  6. Persist both turns (USER + ASSISTANT) to ChatMessage
    │  7. Return reply + sourceDocs
    ▼
Postgres  (ChatSession / ChatMessage tables)
```

---

## Step 1 — Database Schema (`prisma/schema.prisma`)

### New Models Added

```prisma
model ChatSession {
  id          String          @id @default(uuid()) @db.Uuid
  userId      String          @db.Uuid
  contextId   String          @db.Uuid        // eventId OR orgId
  contextType ChatContextType
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    ChatMessage[]

  @@unique([userId, contextId, contextType])  // one session per user per context
  @@index([userId])
  @@index([contextId])
}

model ChatMessage {
  id        String      @id @default(uuid()) @db.Uuid
  sessionId String      @db.Uuid
  role      ChatRole
  content   String
  createdAt DateTime    @default(now())
  session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
}

enum ChatContextType { EVENT ORGANIZATION }
enum ChatRole        { USER  ASSISTANT    }
```

**Apply with:** `npx prisma db push`

---

## Step 2 — AI Service: `chat.py` Router

**File:** `ai-service/app/routers/chat.py`  
**Auth:** `require_master_jwt` (internal Next.js calls only)

### Endpoint: `POST /chat/message`

```
Request:
  sessionId:   "new" | UUID          (pass "new" to create a fresh session)
  userId:      UUID
  contextId:   UUID                  (eventId or orgId)
  contextType: "EVENT"|"ORGANIZATION"
  message:     string (max 1000 chars)

Response:
  sessionId:   UUID                  (created or reused)
  reply:       string
  sourceDocs:  list[str]             (chunk titles used — transparency)
```

### Logic Flow
1. **Resolve session** — upsert `ChatSession` by `(userId, contextId, contextType)`
2. **Load history** — last 10 `ChatMessage` rows ordered ASC (rolling window)
3. **Resolve orgId** — if contextType is EVENT, fetch `Events."organizationId"`
4. **RAG retrieval** — embed message → 3 parallel `OrgDocument` queries
5. **Build prompt** — system prompt with 3 context blocks + history array
6. **Call LLM** — `await generate(...)` from `app/llm.py`
7. **Persist** — insert USER + ASSISTANT messages to `ChatMessage`
8. **Return** response

---

## Step 3 — `lib/ai-service.ts` Extension

New types and `chat()` method added to `aiService` object.

```typescript
export interface AIChatRequest {
  sessionId: string;           // "new" | UUID
  userId: string;
  contextId: string;
  contextType: "EVENT" | "ORGANIZATION";
  message: string;
}

export interface AIChatResponse {
  sessionId: string;
  reply: string;
  sourceDocs: string[];
}
```

---

## Step 4 — `lib/actions/chat.ts`

Two server actions:

| Action | Purpose |
|---|---|
| `sendChatMessage(orgId, params)` | Auth + org/event membership check → calls `aiService.chat()` |
| `getChatHistory(sessionId)` | Returns `ChatMessage[]` for the widget's initial load |

---

## Step 5 — `components/ai/ChatWidget.tsx`

Floating FAB (bottom-right) → slide-up 480px glass-morphism panel.

```
┌───────────────────────────────────────┐
│ 🤖  AI Assistant   [Event badge]   ✕  │  ← header
├───────────────────────────────────────┤
│                                       │
│  [user bubble]    "What time..."      │
│  [AI bubble]      "The event starts   │  ← scrollable messages
│                   at 3pm..."          │    [Source: Event FAQ]
│  [typing ···]                         │
│                                       │
├───────────────────────────────────────┤
│  [textarea]               [Send ↑]    │  ← input footer
└───────────────────────────────────────┘
```

**Key UX details:**
- Source doc badges on every AI reply
- Auto-scroll on new message
- Typing indicator (3-dot animation)
- Empty state hint text
- `id="chat-widget-fab"` / `id="chat-send-btn"` for testability

### Props
```typescript
interface ChatWidgetProps {
  contextId:   string;
  contextType: "EVENT" | "ORGANIZATION";
  contextName: string;   // "AI Summit 2025" | "Acme Corp"
}
```

---

## Step 6 — Embed on Pages

| Page | File |
|---|---|
| Event detail | `app/(protected)/events/[id]/page.tsx` |
| Org dashboard | `app/(protected)/organizations/[id]/dashboard/page.tsx` |

---

## File Checklist

| # | File | Status |
|---|---|---|
| 1 | `prisma/schema.prisma` | ✅ Done |
| 2 | `ai-service/app/routers/chat.py` | ✅ Done |
| 3 | `ai-service/main.py` | ✅ Done |
| 4 | `lib/ai-service.ts` | ✅ Done |
| 5 | `lib/actions/chat.ts` | ✅ Done |
| 6 | `components/ai/ChatWidget.tsx` | ✅ Done |
| 7 | Event page | ✅ Done |
| 8 | Org dashboard page | ✅ Done |
