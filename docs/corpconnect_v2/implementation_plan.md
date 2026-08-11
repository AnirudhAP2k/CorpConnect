# CorpConnect v2 — In-App AI Agent with Agentic Tool Execution

## Overview

Enable CorpConnect users to interact with an in-app AI Agent that can **perform real platform tasks** (create events, manage organizations, fetch analytics, etc.) on their behalf — via natural language. The Agent will use **function calling / tool use** to map user intent to actual domain operations, with each tool call gated by the user's existing permissions and AI quota.

---

## Verification of the Original Proposed Plan

After auditing the full codebase, here are the corrections and refinements to the plan discussed earlier:

> [!IMPORTANT]
> **Auth Strategy Decision: Better Auth vs. NextAuth**
> The original proposal involved `npx auth` (Better Auth / Agent Auth). However, CorpConnect currently runs **NextAuth v5 beta.31** with a Prisma adapter, custom JWT callbacks, refresh tokens, 2FA, and deep session enrichment ([auth.ts](file:///d:/evently/auth.ts), [auth.config.ts](file:///d:/evently/auth.config.ts), [auth.session.ts](file:///d:/evently/auth.session.ts)).
>
> **Migrating to Better Auth is a massive, risky undertaking** that would touch every authenticated page, middleware, API route, and the WebSocket service. It is **NOT required** for the in-app Agent feature. The Agent Auth protocol is designed for *external* AI tools accessing your API (Claude Desktop, ChatGPT, etc.). For the **in-app AI copilot**, we can achieve the same result using the existing session + a lightweight capability scoping layer.
>
> **Recommendation:** Defer Better Auth migration to a future v3 milestone. Ship v2 with the Agent feature using the existing NextAuth infrastructure + a custom capability scoping middleware.

> [!WARNING]
> **LLM Provider Limitation:**
> The current `ai-service` uses Groq (llama-3.1-8b-instant) as default. Llama 3.1 8B has **weak function calling** capability. For reliable agentic tool use, you will need to upgrade to a model that supports robust structured tool calling:
> - **Groq**: `llama-3.3-70b-versatile` or `mixtral-8x7b-32768`
> - **OpenAI**: `gpt-4o-mini` (recommended for cost/quality balance)
> - Make this configurable via a new `LLM_AGENT_MODEL_NAME` env var so the existing RAG/chat features can stay on the cheaper model.

---

## Selected Architecture Decisions

> [!NOTE]
> 1. **Capabilities Scope:** **ALL capabilities included in v2** (Events CRUD, Semantic Search, Recommendations, Profile/Org details, Quota stats, AI Description Gen, Notifications, and Event Invites).
> 2. **Streaming UX:** **Streaming SSE (Server-Sent Events) implemented** via `/agent/stream` for real-time token streaming and tool execution updates.
> 3. **LLM Provider:** **Groq `llama-3.3-70b-versatile`** configured as the dedicated Agent LLM (`LLM_AGENT_MODEL_NAME`) to deliver high-quality agentic function calling within budget constraints.

---

## Proposed Changes

### Component 1: AI Service — Agent Orchestration Engine

The Python `ai-service` is the ideal location for the agent loop since it already manages LLM clients, prompt templates, and conversation persistence.

---

#### [NEW] [tools.py](file:///d:/evently/ai-service/app/tools.py)
Define all available Agent tools as structured function definitions compatible with OpenAI's function calling spec. Each tool maps to a CorpConnect domain operation.

**Phase 1 Tools (Read-only + Event CRUD):**
| Tool Name | Description | Maps to Domain |
|-----------|-------------|----------------|
| `list_my_events` | List events the user is hosting | `domain/events/queries.ts → getHostEvents` |
| `get_event_details` | Get full details of a specific event | `domain/events/queries.ts → getEventById` |
| `create_event` | Create a new event for the user's org | `domain/events/actions.ts → createEventAction` |
| `update_event` | Update an existing event | `domain/events/actions.ts → updateEventAction` |
| `search_events` | Semantic search across events | `ai-service/routers/search.py` |
| `get_recommendations` | Get AI event/org recommendations | `ai-service/routers/recommend.py` |
| `get_my_profile` | Fetch current user profile | `domain/users/queries.ts` |
| `get_org_details` | Get user's active organization info | `domain/organizations/queries.ts` |

**Phase 2 Tools (Extended):**
| Tool Name | Maps to Domain |
|-----------|----------------|
| `delete_event` | `domain/events/actions.ts → deleteEventAction` |
| `generate_event_description` | `domain/ai/actions.ts` |
| `get_ai_usage_stats` | `domain/ai/quota.ts → getAiUsageStats` |
| `list_notifications` | `domain/notifications/` |
| `send_event_invites` | `domain/events/actions.ts → sendEventInvitesAction` |

---

#### [NEW] [agent.py](file:///d:/evently/ai-service/app/routers/agent.py)
The core agent endpoint: `POST /agent/execute`

**Architecture:**
```
User prompt + userId + orgId + capabilities
       │
       ▼
┌─────────────────────────────────────────┐
│  Agent Loop (ReAct Pattern)             │
│                                         │
│  1. LLM receives prompt + tool defs     │
│  2. LLM decides: respond OR tool_call   │
│  3. If tool_call:                       │
│     a. Validate capability (can user    │
│        perform this action?)            │
│     b. Forward to Next.js domain API    │
│        with user's scoped token         │
│     c. Feed result back to LLM          │
│  4. Repeat until final answer           │
│  5. Persist conversation + return       │
└─────────────────────────────────────────┘
```

Key implementation details:
- **Max iterations:** Cap the loop at 5 tool calls per request to prevent runaway agent loops
- **Tool execution:** Each tool call makes an HTTP request to the Next.js backend's internal agent API routes, forwarding the user's identity
- **Conversation persistence:** Reuse the existing `ChatSession` / `ChatMessage` tables with a new `contextType = "AGENT"` enum value
- **Streaming (if opted):** Use `StreamingResponse` with SSE to stream both reasoning and tool execution status

---

#### [MODIFY] [config.py](file:///d:/evently/ai-service/app/config.py)
Add agent-specific configuration:
```python
# Agent LLM (may differ from RAG LLM for better tool-calling)
LLM_AGENT_MODEL_NAME: str = "gpt-4o-mini"
LLM_AGENT_MAX_TOKENS: int = 1200
LLM_AGENT_MAX_ITERATIONS: int = 5
```

#### [MODIFY] [main.py](file:///d:/evently/ai-service/main.py)
Register the new agent router:
```python
from app.routers import agent
app.include_router(agent.router, prefix="/agent", tags=["AI Agent"])
```

#### [NEW] [agent_prompt.yaml](file:///d:/evently/ai-service/app/prompts/templates/agent_prompt.yaml)
System prompt template that defines the Agent's persona, available capabilities, and behavioral guardrails (e.g., always confirm before destructive actions, never fabricate data).

---

### Component 2: Next.js Backend — Internal Agent API Routes

The AI service's agent loop needs to execute domain operations. Instead of duplicating Prisma logic, it calls thin internal API routes that delegate to the existing `domain/` layer.

---

#### [NEW] `app/api/internal/agent/[tool]/route.ts`
A single dynamic route that maps tool names to domain functions:

```typescript
// app/api/internal/agent/[tool]/route.ts
// Auth: Master JWT only (same as existing ai-service → Next.js pattern)
// The agent passes userId/orgId in the body; the route calls domain
// functions after verifying membership/permissions

export async function POST(req, { params }) {
  // 1. Verify master JWT (reuse existing pattern from lib/ai-service.ts)
  // 2. Extract { userId, orgId, toolArgs } from body
  // 3. Verify user permissions (org membership, role checks)
  // 4. Delegate to domain function
  // 5. Return result
}
```

Supported tool→domain mappings:
| Tool | Domain Function |
|------|----------------|
| `list_my_events` | `getHostEvents(orgId)` |
| `get_event_details` | `getEventById(eventId)` |
| `create_event` | `createEventAction(data)` |
| `update_event` | `updateEventAction(eventId, data)` |
| `search_events` | Forward to `ai-service/search` |
| `get_recommendations` | Forward to `ai-service/recommend` |
| `get_my_profile` | `getUserById(userId)` |
| `get_org_details` | `getOrganizationById(orgId)` |

> [!NOTE]
> This approach follows the existing `master JWT` service-to-service auth pattern already used for chat, brainstorm, generate, and analyse endpoints. No new auth mechanism is required.

---

#### [NEW] [agent-capability.ts](file:///d:/evently/domain/ai/agent-capability.ts)
A lightweight capability scoping module that determines which tools a user/org has access to based on:
- **Org membership role** (ADMIN vs MEMBER) — e.g., only ADMINs can delete events
- **Subscription plan** (FREE/PRO/ENTERPRISE) — e.g., only PRO+ can use agent
- **Feature flags** — gradual rollout

```typescript
export function getAgentCapabilities(
  role: string,
  plan: SubscriptionPlan
): string[] {
  const readTools = ["list_my_events", "get_event_details", "search_events", ...];
  const writeTools = ["create_event", "update_event"];
  const adminTools = ["delete_event", "send_event_invites"];

  let capabilities = [...readTools];
  if (plan !== "FREE") capabilities.push(...writeTools);
  if (role === "ADMIN") capabilities.push(...adminTools);
  return capabilities;
}
```

---

### Component 3: Prisma Schema Updates

---

#### [MODIFY] [schema.prisma](file:///d:/evently/prisma/schema.prisma)

**Add `AGENT` to `ChatContextType` enum:**
```diff
 enum ChatContextType {
   EVENT
   ORGANIZATION
+  AGENT
 }
```

This allows the Agent to reuse the existing `ChatSession` + `ChatMessage` tables for conversation persistence, keeping the data model unified.

---

### Component 4: Next.js Domain Layer — Agent Server Action

---

#### [NEW] [agent-actions.ts](file:///d:/evently/domain/ai/agent-actions.ts)
New server action that the frontend calls:

```typescript
"use server";

export async function executeAgentPrompt(
  message: string,
  sessionId: string = "new",
): Promise<AgentResponse> {
  // 1. Auth check (existing session)
  // 2. Determine capabilities based on user role + plan
  // 3. Quota check (reuse checkAiQuota with new "agent" feature type)
  // 4. Call ai-service /agent/execute with:
  //    { message, userId, orgId, sessionId, capabilities }
  // 5. Deduct AI usage
  // 6. Return agent response
}
```

#### [MODIFY] [types.ts](file:///d:/evently/domain/ai/types.ts)
Add `"agent"` to `AiFeatureType`:
```diff
 export type AiFeatureType =
     | "recommendEvents"
     | "recommendOrgs"
     | "search"
     | "generateDescription"
     | "matchmakingReason"
     | "chat"
     | "chatHistory"
     | "chatBrainstorm"
-    | "chatBrainstormBrief";
+    | "chatBrainstormBrief"
+    | "agent";
```

#### [MODIFY] [index.ts](file:///d:/evently/domain/ai/index.ts)
Export the new agent action and capability module.

---

### Component 5: Frontend — AI Agent Copilot UI

---

#### [NEW] `components/ai/AgentCopilot.tsx`
A floating command-palette style drawer (accessible via `Cmd+K` / a dedicated button) that replaces / augments the existing `ChatWidget` for agent interactions.

**Key differences from existing [ChatWidget.tsx](file:///d:/evently/components/ai/ChatWidget.tsx):**
- **Not context-bound:** The existing ChatWidget is scoped to a specific event/org. The Agent Copilot is **global** — it can perform actions across the entire platform.
- **Tool execution feedback:** Shows real-time status of tool calls ("Creating event...", "✓ Event created", "Fetching your schedule...").
- **Confirmation prompts:** For destructive actions (delete, update), the Agent asks for user confirmation before executing.
- **Action cards:** Tool results are rendered as interactive cards (e.g., an event card with a "View" link after creation).

**UI Design:**
```
┌─────────────────────────────────────┐
│  🤖 CorpConnect AI Agent      [×]  │
│  ────────────────────────────────── │
│                                     │
│  [User] Create a Tech Conference   │
│         for next Friday            │
│                                     │
│  [Agent] I'll create that for you. │
│          Here's what I'll set up:  │
│                                     │
│  ┌─ Event Preview Card ──────────┐ │
│  │ 📅 Tech Conference            │ │
│  │ 🗓 Friday, Aug 15, 2026      │ │
│  │ 📍 TBD                       │ │
│  │ [Confirm & Create] [Edit]    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ────────────────────────────────── │
│  [Type a message... ]    [Send ▶] │
└─────────────────────────────────────┘
```

---

#### [NEW] `components/ai/AgentToolStatus.tsx`
A sub-component that renders the visual status of each tool call:
- 🔄 Executing... (with tool name)
- ✅ Success (with result summary)
- ❌ Failed (with error message)
- ⚠️ Requires confirmation (with Confirm/Cancel buttons)

---

### Component 6: AI Service Client Updates

---

#### [MODIFY] [ai-service.ts](file:///d:/evently/lib/ai-service.ts)
Add the agent execution method:

```typescript
async executeAgentPrompt(payload: {
  message: string;
  userId: string;
  orgId: string;
  sessionId: string;
  capabilities: string[];
}): Promise<AgentResponse | null> {
  const res = await axios.post<AgentResponse>(
    `${AI_SERVICE_URL}/agent/execute`,
    payload,
    { headers: await authHeaders(), timeout: 60_000 },
  );
  return res.data;
}
```

---

## File Change Summary

| Layer | Action | File |
|-------|--------|------|
| **ai-service** | NEW | `app/tools.py` — Tool definitions |
| **ai-service** | NEW | `app/routers/agent.py` — Agent loop endpoint |
| **ai-service** | NEW | `app/prompts/templates/agent_prompt.yaml` — Agent system prompt |
| **ai-service** | MODIFY | `app/config.py` — Agent LLM config |
| **ai-service** | MODIFY | `main.py` — Register agent router |
| **Next.js API** | NEW | `app/api/internal/agent/[tool]/route.ts` — Tool execution routes |
| **Domain** | NEW | `domain/ai/agent-capability.ts` — Capability scoping |
| **Domain** | NEW | `domain/ai/agent-actions.ts` — Agent server action |
| **Domain** | MODIFY | `domain/ai/types.ts` — Add "agent" feature type |
| **Domain** | MODIFY | `domain/ai/index.ts` — Export new modules |
| **Prisma** | MODIFY | `prisma/schema.prisma` — Add AGENT context type |
| **Lib** | MODIFY | `lib/ai-service.ts` — Add agent HTTP method |
| **Frontend** | NEW | `components/ai/AgentCopilot.tsx` — Main copilot UI |
| **Frontend** | NEW | `components/ai/AgentToolStatus.tsx` — Tool execution feedback |

---

## Implementation Phases

### Phase 1: Foundation (Agent Loop + Read-Only Tools)
1. Schema migration (add `AGENT` context type)
2. Agent tool definitions (`tools.py`)
3. Agent loop endpoint (`agent.py`)
4. Internal agent API route (Next.js)
5. Capability scoping module
6. Agent server action
7. AI service client method
8. Basic `AgentCopilot.tsx` with chat-style UI

### Phase 2: Write Operations + Confirmation UX
1. Add write tools (create_event, update_event)
2. Confirmation flow in the agent loop
3. `AgentToolStatus.tsx` component
4. Action cards / preview cards in UI

### Phase 3: Extended Tools + Polish
1. Add remaining tools (delete, invites, notifications, description gen)
2. `Cmd+K` keyboard shortcut
3. Streaming responses (SSE)
4. Onboarding tooltip for new users

---

## Verification Plan

### Automated Tests
```bash
# Python agent loop unit tests
cd ai-service && python -m pytest tests/test_agent.py -v

# Next.js domain tests
cd d:\evently && pnpm test -- --testPathPattern="agent"

# Prisma migration
npx prisma migrate dev --name add-agent-context-type
```

### Manual Verification
1. Open the Agent Copilot in the browser
2. Send: *"What events am I hosting?"* → verify it calls `list_my_events` and returns real data
3. Send: *"Create a networking event for next Monday"* → verify confirmation card appears → confirm → verify event appears in Events page
4. Send: *"Delete all my events"* → verify the agent rejects this if user is not ADMIN
5. Verify AI quota is deducted for each agent session
6. Test with FREE plan user → verify write tools are not available
