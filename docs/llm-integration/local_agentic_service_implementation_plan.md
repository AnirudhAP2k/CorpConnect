# Local Agentic AI Service — Implementation Plan

This document outlines the step-by-step strategy for upgrading the existing read-only RAG `/chat` endpoint within the CorpConnect `ai-service` to a proactive, **action-taking Agentic workflow**. 

Crucially, this architecture guarantees **100% data confidentiality** by using locally hosted Large Language Models (LLMs) and retaining complete control of the database inside the local Python execution environment.

## Overview & Architecture

**Goal:** Allow users to say, "Create a networking event for next Friday" or "Find me 3 organizations focused on CleanTech," and have the AI autonomously execute these tasks using internal tools.

**Privacy Guarantee:** The database is **never** synchronized, zipped, or dumped to the LLM. The LLM acts solely as a linguistic processing engine. It reads the user prompt, reads the "Tool Schema" (an instruction manual of available capabilities), and returns a JSON object. Your local Python service performs the actual DB transactions.

---

## Phase 1: Localizing the LLM Engine

To ensure data confidentiality, we detach from managed APIs (like OpenAI or Groq) and run inference natively.

1. **Install an Inference Engine:** Deploy `Ollama`, `vLLM`, or `llama.cpp` on your local infrastructure.
2. **Download Model:** Pull a model adept at Tool Calling, such as `llama-3.1-8b-instruct`.
3. **Environment Update:** Since you already use the `AsyncOpenAI` client in `app/llm.py`, you do **not** need to rewrite your library logic. You simply redirect the base URL in `ai-service/.env`:
   ```bash
   LLM_PROVIDER="local"
   LLM_API_BASE_URL="http://localhost:11434/v1" # Example Ollama port
   LLM_MODEL_NAME="llama3.1"
   LLM_API_KEY="sk-unnecessary" # Local hosts rarely require true keys
   ```

## Phase 2: Defining the Tool Schemas (The "Body")

Define exactly what the Agent is allowed to do. In `ai-service`, create a new module `app/tools.py`.

1. **Create Python Execution Functions:**
   Create secure, tenant-scoped python methods.
   ```python
   async def execute_create_event(pool, org_id: str, title: str, start_date: str):
       # Secure Database INSERT occurs here
       # Ensures org_id is ALWAYS enforced by the system, never bypassable by the LLM
   ```
2. **Create the OpenAI-compatible Tool Definitions:**
   ```python
   # This is the ONLY thing sent to the LLM
   AGENT_TOOLS = [
       {
           "type": "function",
           "function": {
               "name": "create_event",
               "description": "Creates a new event for the organization. Requires title and start_date.",
               "parameters": {
                   "type": "object",
                   "properties": {
                       "title": {"type": "string", "description": "Name of the event"},
                       "start_date": {"type": "string", "description": "ISO format date"}
                   },
                   "required": ["title", "start_date"]
               }
           }
       }
   ]
   ```

## Phase 3: Upgrading `routers/chat.py` (The "Brain")

Your `/chat/message` endpoint currently accepts an input and generates one text output. It must be updated to a **ReAct loop** (Reason + Act).

1. **Inject Tools into the Completion Call:**
   Update your `client.chat.completions.create` to include the `tools` parameter.
2. **Handle Tool Calls (The Agentic Loop):**
   When the LLM finishes, check the response:
   *   If `finish_reason == "tool_calls"`, parse the JSON arguments it requested.
   *   Execute the corresponding Python function locally.
   *   Append a new message with `{"role": "tool", "tool_call_id": "...", "content": "Event successfully inserted!"}`.
   *   **Recall the LLM** with this updated history so it can formulate a final friendly response (e.g., *"I've successfully created your event for Next Friday!"*).
3. **Return to Frontend:** Finally, return the string reply.

## Phase 4: Upgrading State & Memory

Because the AI might require multiple exchanges to finish a task (e.g., missing the event date), the chat history needs to store intermediate tool states.

1. **Update Postgres Schema:** 
   *    Modify the `ChatMessage` table ENUM to support `tool` and `function` roles.
   *    Add JSONB columns for `tool_calls` and `tool_call_id` to properly replay prior steps to the LLM when pulling session history.

## Phase 5: Next.js Frontend Enhancements

The chat UI should reflect that the AI is actively "working" on the platform, rather than just typing out text.

1. **Action Metadata:** When the Python backend successfully executes a tool, append a flag into the `ChatMessageResponse` model (e.g., `action_taken: "EVENT_CREATED"`).
2. **Real-time UI Refresh:** Next.js can intercept this `action_taken` flag and automatically trigger a fast refresh (`router.refresh()`) or query invalidation so the user instantly sees the newly created event appear on their organization dashboard without refreshing the page.

---

## Security Checklist

* [ ] **Strict Scoping:** Every tool function MUST take the `userId` / `orgId` explicitly pulled from the JWT token / Request Context. The LLM must **never** be responsible for providing the ID of the entity it is acting on.
* [ ] **Data Minimization:** Keep tool schemas completely sanitized. They should not reflect the actual names of your Postgres columns if they reveal internal architectural secrets.
* [ ] **N8n Synergy:** Consider wrapping your complex multi-step functions inside an `n8n` webhook. Instead of the LLM knowing how to do everything, the LLM just calls one tool: `trigger_n8n_workflow("setup_event")`.
