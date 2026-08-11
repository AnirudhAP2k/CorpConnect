# CorpConnect v2 — AI Agent Implementation Tasks

## Phase 1: Foundation (Agent Loop + Read-Only Tools)

- [x] Prisma schema: Add `AGENT` to `ChatContextType` enum + migrate
- [x] `ai-service/app/tools.py` — Agent tool definitions (read-only + write + admin tools)
- [x] `ai-service/app/prompts/templates/agent_prompt.yaml` — Agent system prompt
- [x] `ai-service/app/config.py` — Add agent LLM config vars
- [x] `ai-service/app/routers/agent.py` — Agent loop endpoint (ReAct pattern)
- [x] `ai-service/main.py` — Register agent router
- [x] `domain/ai/agent-capability.ts` — Capability scoping module
- [x] `domain/ai/types.ts` — Add `"agent"` to `AiFeatureType`
- [x] `domain/ai/agent-actions.ts` — Agent server action (Next.js)
- [x] `domain/ai/index.ts` — Export new modules
- [x] `app/api/internal/agent/[tool]/route.ts` — Internal agent tool execution API
- [x] `lib/ai-service.ts` — Add `executeAgentPrompt` method
- [x] `components/ai/AgentCopilot.tsx` — Main copilot UI component
- [x] `components/ai/AgentToolStatus.tsx` — Tool status feedback component
- [x] Integration in `app/(protected)/layout.tsx` for global dashboard access
- [x] Verify: Prisma generate, basic agent loop works end-to-end

## Phase 2: Write Operations + Confirmation UX

- [x] Add write tools to `tools.py` (create_event, update_event, delete_event)
- [x] Add confirmation flow in agent prompt & tool definitions
- [x] `components/ai/AgentToolStatus.tsx` — Tool execution feedback component
- [x] Action cards / preview cards for tool results

## Phase 3: Extended Tools + Polish

- [x] Add extended tools (delete_event, generate_event_description, list_notifications, send_event_invites)
- [x] `Cmd+K` keyboard shortcut integration in `AgentCopilot.tsx`
- [x] Quick suggestion chips in `AgentCopilot.tsx`
- [x] Configure Groq `llama-3.3-70b-versatile` as agent LLM model
- [x] Implement real-time SSE streaming (`/agent/stream`) in Python ai-service
