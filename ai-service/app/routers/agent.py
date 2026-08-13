"""
routers/agent.py — POST /agent/execute

CorpConnect AI Agent — ReAct-style agentic loop with tool execution.

The agent receives a user prompt along with their identity and capabilities,
then iteratively reasons and calls tools until it produces a final answer.

Tool execution is forwarded to the Next.js backend via internal API routes,
which delegate to the existing domain layer (domain/events, domain/users, etc.)

Auth: require_master_jwt (internal Next.js server action calls only).
Capability enforcement is done server-side before each tool call.
"""

import asyncio
from datetime import timedelta
import json
import logging
import time
import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import httpx

from app.agent_guards import (
    CONFIRMATION_REQUIRED_TOOLS,
    is_meta_capabilities_question,
    soft_fail_error_from_body,
    write_action_allowed,
)
from app.config import settings
from app.llm import is_llm_configured, get_llm_client
from app.middleware.auth import require_master_jwt
from app.prompts import load_prompt
from app.database import get_pool
from app.tools import get_tools_for_capabilities, TOOL_TIERS, ALL_TOOLS

from jose import jwt as jose_jwt
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])

MAIN_APP_BASE_URL = settings.MAIN_APP_BASE_URL

# In-memory timestamp tracking to throttle rapid spammed prompts per session
_SESSION_LAST_REQUEST: dict[str, float] = {}

_AUTH_TOKEN = ""

# ─── Constants ────────────────────────────────────────────────────────────────

_HISTORY_LIMIT = 20  # rolling conversation window for agent sessions


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class AgentExecuteRequest(BaseModel):
    sessionId: str = Field("new", description="Agent session UUID or 'new' to start fresh.")
    userId: str = Field(..., description="UUID of the requesting user.")
    orgId: str = Field(..., description="UUID of the user's active organization.")
    message: str = Field(..., min_length=1, max_length=2000)
    capabilities: list[str] = Field(
        ..., description="List of tool names the user is authorised to call."
    )
    userName: str = Field("User", description="Display name of the user.")
    orgName: str = Field("Organization", description="Name of the user's org.")
    orgPlan: str = Field("FREE", description="Subscription plan.")
    userRole: str = Field("MEMBER", description="User's role in the org.")


class ToolCallResult(BaseModel):
    toolName: str
    status: str  # "success" | "error" | "denied"
    result: dict | list | str | None = None
    error: str | None = None


class AgentExecuteResponse(BaseModel):
    sessionId: str
    reply: str
    toolCalls: list[ToolCallResult] = []


# ─── Agent LLM Client ────────────────────────────────────────────────────────

_agent_client: AsyncOpenAI | None = None


def _get_agent_client() -> AsyncOpenAI:
    """
    Return the agent-specific LLM client, falling back to the primary
    LLM client if no agent-specific config is set.
    """
    global _agent_client
    if _agent_client is not None:
        return _agent_client

    # Use agent-specific config if available, else fall back to primary
    api_key = settings.LLM_AGENT_API_KEY or settings.LLM_API_KEY
    if not api_key:
        raise RuntimeError("No LLM API key configured for the agent.")

    base_url = (
        settings.LLM_AGENT_API_BASE_URL
        or settings.LLM_API_BASE_URL
        or None
    )
    # Empty string → None (so OpenAI SDK uses its default)
    if base_url == "":
        base_url = None

    _agent_client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    model = settings.LLM_AGENT_MODEL_NAME or settings.LLM_MODEL_NAME
    logger.info("Agent LLM client initialised — model=%s", model)
    return _agent_client


def _get_agent_model() -> str:
    """Return the model name for the agent (with fallback)."""
    return settings.LLM_AGENT_MODEL_NAME or settings.LLM_MODEL_NAME

# ─── DB Helpers ───────────────────────────────────────────────────────────────

async def _resolve_agent_session(pool, user_id: str, org_id: str) -> str:
    """
    Find or create an AGENT-type ChatSession for the user in their org.
    Returns the session UUID.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id FROM "ChatSession"
            WHERE "userId" = $1::uuid
              AND "contextId" = $2::uuid
              AND "contextType" = 'AGENT'
            """,
            user_id, org_id,
        )
        if row:
            await conn.execute(
                'UPDATE "ChatSession" SET "updatedAt" = NOW() WHERE id = $1::uuid',
                str(row["id"]),
            )
            return str(row["id"])

        new_id = str(uuid_lib.uuid4())
        await conn.execute(
            """
            INSERT INTO "ChatSession" (id, "userId", "contextId", "contextType", "createdAt", "updatedAt")
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'AGENT', NOW(), NOW())
            """,
            new_id, user_id, org_id,
        )
        return new_id


async def _load_history(pool, session_id: str) -> list[dict]:
    """Load the last N messages for the agent session, oldest first."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content FROM "ChatMessage"
            WHERE "sessionId" = $1::uuid
            ORDER BY "createdAt" DESC
            LIMIT $2
            """,
            session_id, _HISTORY_LIMIT,
        )
    return [{"role": r["role"].lower(), "content": r["content"]} for r in reversed(rows)]


async def _persist_messages(
    pool, session_id: str, user_content: str, assistant_content: str
) -> None:
    """Insert the USER turn and ASSISTANT reply as a pair."""
    user_id = str(uuid_lib.uuid4())
    ai_id = str(uuid_lib.uuid4())
    async with pool.acquire() as conn:
        await conn.executemany(
            """
            INSERT INTO "ChatMessage" (id, "sessionId", role, content, "createdAt")
            VALUES ($1::uuid, $2::uuid, $3::"ChatRole", $4, NOW())
            """,
            [
                (user_id, session_id, "USER", user_content),
                (ai_id, session_id, "ASSISTANT", assistant_content),
            ],
        )


# ─── Tool Executor ────────────────────────────────────────────────────────────

async def _execute_tool(
    tool_name: str,
    tool_args: dict,
    user_id: str,
    org_id: str,
    capabilities: list[str],
    *,
    user_message: str = "",
    writes_already_executed: int = 0,
) -> ToolCallResult:
    """
    Execute a tool by calling the Next.js internal agent API.
    Validates capability and write-confirmation before making the call.
    """
    logger.info(
        "[_execute_tool] tool=%s user=%s org=%s args=%s",
        tool_name, user_id[:8], org_id[:8], json.dumps(tool_args)[:200],
    )

    # 1. Capability check
    if tool_name not in capabilities:
        logger.warning("[_execute_tool] Capability denied: tool=%s user=%s org=%s", tool_name, user_id[:8], org_id[:8])
        return ToolCallResult(
            toolName=tool_name,
            status="denied",
            error=f"You don't have permission to use '{tool_name}'. "
                  f"This may require a higher subscription plan or admin role.",
        )

    if tool_name not in ALL_TOOLS:
        logger.error("[_execute_tool] Unknown tool requested: tool=%s", tool_name)
        return ToolCallResult(
            toolName=tool_name,
            status="error",
            error=f"Unknown tool '{tool_name}'.",
        )

    # 1b. Write confirmation gate (prompt-only confirmation is not enough)
    allowed, denial = write_action_allowed(
        tool_name,
        user_message=user_message,
        tool_args=tool_args,
        writes_already_executed=writes_already_executed,
    )
    if not allowed:
        logger.warning(
            "[_execute_tool] Write confirmation denied: tool=%s user=%s",
            tool_name, user_id[:8],
        )
        return ToolCallResult(
            toolName=tool_name,
            status="denied",
            error=denial,
        )

    # 2. Forward to Next.js internal API
    try:
        # Generate a short-lived master JWT for the internal call
        now_ts = int(datetime.now(timezone.utc).timestamp())
        master_token = jose_jwt.encode(
            {
                "role": "master",
                "iat": now_ts,
                "exp": now_ts + 300,
            },
            settings.MASTER_KEY,
            algorithm=settings.HASHING_ALGO,
        )
        payload = {
            "userId": user_id,
            "orgId": org_id,
            "toolArgs": tool_args,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{MAIN_APP_BASE_URL}/api/internal/agent/{tool_name}",
                json=payload,
                headers={
                    "X-Agent-Token": master_token,
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 200:
            data = resp.json()
            soft_error = soft_fail_error_from_body(data)
            if soft_error is not None:
                logger.warning(
                    "[_execute_tool] Tool '%s' soft-failed: %s",
                    tool_name, soft_error,
                )
                return ToolCallResult(
                    toolName=tool_name,
                    status="error",
                    error=soft_error,
                )
            logger.info("[_execute_tool] Tool '%s' executed successfully (HTTP 200)", tool_name)
            return ToolCallResult(
                toolName=tool_name,
                status="success",
                result=data,
            )
        else:
            error_detail = resp.json().get("error", resp.text) if resp.headers.get("content-type", "").startswith("application/json") else resp.text
            logger.error("[_execute_tool] Tool '%s' failed (HTTP %d): %s", tool_name, resp.status_code, error_detail)
            return ToolCallResult(
                toolName=tool_name,
                status="error",
                error=f"Tool execution failed (HTTP {resp.status_code}): {error_detail}",
            )

    except httpx.ConnectError:
        logger.error("[_execute_tool] Connection refused when calling Next.js backend at %s", MAIN_APP_BASE_URL)
        return ToolCallResult(
            toolName=tool_name,
            status="error",
            error="Could not reach the CorpConnect backend. Please try again.",
        )
    except Exception as e:
        logger.exception("Tool execution exception for %s: %s", tool_name, e)
        return ToolCallResult(
            toolName=tool_name,
            status="error",
            error=f"An unexpected error occurred: {str(e)}",
        )

# ─── Route ────────────────────────────────────────────────────────────────────

@router.post(
    "/execute",
    response_model=AgentExecuteResponse,
    summary="Execute an AI agent prompt with tool-calling capabilities",
)
async def agent_execute(body: AgentExecuteRequest):
    """
    Accept a user prompt, run the ReAct agent loop with available tools,
    persist the conversation, and return the final response with tool call results.
    """
    if not (settings.LLM_AGENT_API_KEY or settings.LLM_API_KEY):
        raise HTTPException(
            status_code=503,
            detail="LLM API key is not configured. Set LLM_API_KEY or LLM_AGENT_API_KEY in ai-service/.env.",
        )

    pool = get_pool()

    # ── 1. Resolve / create agent session ─────────────────────────────────
    session_id = await _resolve_agent_session(pool, body.userId, body.orgId)

    logger.info(
        "[agent_execute] session=%s user=%s org=%s role=%s plan=%s prompt='%s' capabilities=%s",
        session_id[:8], body.userId[:8], body.orgId[:8], body.userRole, body.orgPlan, body.message, body.capabilities,
    )

    # ── 2. Load conversation history ──────────────────────────────────────
    history = await _load_history(pool, session_id)

    # ── 3. Build system prompt ────────────────────────────────────────────
    prompt_tpl = load_prompt("agent_prompt")
    available_tool_names = ", ".join(body.capabilities)
    system_prompt = prompt_tpl.format_system(
        user_name=body.userName,
        org_name=body.orgName,
        org_plan=body.orgPlan,
        user_role=body.userRole,
        current_datetime=datetime.now(timezone.utc).strftime("%A, %d %B %Y at %H:%M UTC"),
        available_tools=available_tool_names,
    )

    # ── 4. Get tools for the user's capabilities ─────────────────────────
    # Meta capability questions must be answered from the prompt — disable tools.
    meta_capabilities = is_meta_capabilities_question(body.message)
    tools = (
        []
        if meta_capabilities
        else get_tools_for_capabilities(body.capabilities)
    )
    if meta_capabilities:
        logger.info(
            "[agent_execute] meta capabilities question — tools disabled session=%s",
            session_id[:8],
        )

    # ── 5. Build messages array ───────────────────────────────────────────
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": body.message},
    ]

    # ── 6. ReAct loop ────────────────────────────────────────────────────
    client = _get_agent_client()
    model = _get_agent_model()
    max_iterations = settings.LLM_AGENT_MAX_ITERATIONS
    all_tool_results: list[ToolCallResult] = []
    writes_executed = 0

    for iteration in range(max_iterations):
        logger.info(
            "[agent] iteration=%d session=%s user=%s",
            iteration + 1, session_id[:8], body.userId[:8],
        )

        completion = await client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools if tools else None,
            max_tokens=settings.LLM_AGENT_MAX_TOKENS,
            temperature=prompt_tpl.temperature or 0.2,
        )

        choice = completion.choices[0]
        assistant_msg = choice.message

        # ── 6a. No tool calls → final answer ─────────────────────────────
        if not assistant_msg.tool_calls:
            final_reply = assistant_msg.content or "I'm sorry, I couldn't process that request."
            break

        # ── 6b. Process tool calls ────────────────────────────────────────
        # Append the assistant's message (with tool_calls) to history
        messages.append(assistant_msg)

        for tool_call in assistant_msg.tool_calls:
            fn_name = tool_call.function.name
            try:
                fn_args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                fn_args = {}

            logger.info(
                "[agent] tool_call=%s args=%s",
                fn_name, json.dumps(fn_args)[:200],
            )

            # Execute the tool
            result = await _execute_tool(
                fn_name,
                fn_args,
                body.userId,
                body.orgId,
                body.capabilities,
                user_message=body.message,
                writes_already_executed=writes_executed,
            )
            all_tool_results.append(result)
            if (
                result.status == "success"
                and fn_name in CONFIRMATION_REQUIRED_TOOLS
            ):
                writes_executed += 1

            # Build the tool response message for the LLM
            if result.status == "success":
                tool_content = json.dumps(result.result, default=str)
            elif result.status == "denied":
                tool_content = json.dumps({"error": result.error, "status": "permission_denied"})
            else:
                tool_content = json.dumps({"error": result.error, "status": "error"})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_content,
            })
    else:
        # Max iterations reached without a final answer
        final_reply = (
            "I've reached the maximum number of steps for this request. "
            "Here's what I found so far. Please try a more specific question."
        )

    # ── 7. Persist conversation ───────────────────────────────────────────
    await _persist_messages(pool, session_id, body.message, final_reply)

    logger.info(
        "[agent] completed session=%s tools_called=%d iterations=%d",
        session_id[:8], len(all_tool_results),
        min(iteration + 1, max_iterations) if 'iteration' in dir() else 0,
    )

    return AgentExecuteResponse(
        sessionId=session_id,
        reply=final_reply,
        toolCalls=all_tool_results,
    )


@router.post("/stream", summary="Stream agent responses and tool execution status via SSE")
async def agent_stream(body: AgentExecuteRequest):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Streams token content and tool execution events in real-time as the agent works.
    """
    if not (settings.LLM_AGENT_API_KEY or settings.LLM_API_KEY):
        raise HTTPException(
            status_code=503,
            detail="LLM API key is not configured. Set LLM_API_KEY or LLM_AGENT_API_KEY in ai-service/.env.",
        )

    pool = get_pool()
    session_id = await _resolve_agent_session(pool, body.userId, body.orgId)

    logger.info(
        "[agent_stream] session=%s user=%s org=%s role=%s plan=%s prompt='%s' capabilities=%s",
        session_id[:8], body.userId[:8], body.orgId[:8], body.userRole, body.orgPlan, body.message[:60], body.capabilities,
    )

    # Throttle rapid consecutive prompts to protect Groq API rate limits
    now = time.time()
    last_req = _SESSION_LAST_REQUEST.get(session_id, 0.0)
    if now - last_req < 1.5:
        await asyncio.sleep(1.5 - (now - last_req))
    _SESSION_LAST_REQUEST[session_id] = time.time()

    history = await _load_history(pool, session_id)

    prompt_tpl = load_prompt("agent_prompt")
    available_tool_names = ", ".join(body.capabilities)
    system_prompt = prompt_tpl.format_system(
        user_name=body.userName,
        org_name=body.orgName,
        org_plan=body.orgPlan,
        user_role=body.userRole,
        current_datetime=datetime.now(timezone.utc).strftime("%A, %d %B %Y at %H:%M UTC"),
        available_tools=available_tool_names,
    )

    meta_capabilities = is_meta_capabilities_question(body.message)
    tools = (
        []
        if meta_capabilities
        else get_tools_for_capabilities(body.capabilities)
    )
    if meta_capabilities:
        logger.info(
            "[agent_stream] meta capabilities question — tools disabled session=%s",
            session_id[:8],
        )
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": body.message},
    ]

    async def event_generator():
        client = _get_agent_client()
        model = _get_agent_model()
        max_iterations = settings.LLM_AGENT_MAX_ITERATIONS
        full_reply_parts = []
        writes_executed = 0

        yield f"data: {json.dumps({'type': 'session', 'sessionId': session_id})}\n\n"

        for iteration in range(max_iterations):
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=tools if tools else None,
                max_tokens=settings.LLM_AGENT_MAX_TOKENS,
                temperature=prompt_tpl.temperature or 0.2,
                stream=True,
            )

            tool_calls_dict = {}

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta

                # Text token
                if delta.content:
                    full_reply_parts.append(delta.content)
                    yield f"data: {json.dumps({'type': 'token', 'content': delta.content})}\n\n"

                # Tool call accumulators
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_dict:
                            tool_calls_dict[idx] = {
                                "id": tc.id or "",
                                "name": tc.function.name if tc.function and tc.function.name else "",
                                "args": tc.function.arguments if tc.function and tc.function.arguments else "",
                            }
                        else:
                            if tc.id:
                                tool_calls_dict[idx]["id"] += tc.id
                            if tc.function and tc.function.name:
                                tool_calls_dict[idx]["name"] += tc.function.name
                            if tc.function and tc.function.arguments:
                                tool_calls_dict[idx]["args"] += tc.function.arguments

            # If no tool calls in this turn, we are finished
            if not tool_calls_dict:
                break

            # Execute tool calls
            assistant_tool_calls = []
            for idx, tc_data in tool_calls_dict.items():
                fn_name = tc_data["name"]
                try:
                    fn_args = json.loads(tc_data["args"])
                except Exception:
                    fn_args = {}

                yield f"data: {json.dumps({'type': 'tool_start', 'toolName': fn_name})}\n\n"

                result = await _execute_tool(
                    fn_name,
                    fn_args,
                    body.userId,
                    body.orgId,
                    body.capabilities,
                    user_message=body.message,
                    writes_already_executed=writes_executed,
                )
                if (
                    result.status == "success"
                    and fn_name in CONFIRMATION_REQUIRED_TOOLS
                ):
                    writes_executed += 1

                yield f"data: {json.dumps({'type': 'tool_end', 'toolName': fn_name, 'status': result.status, 'result': result.result, 'error': result.error})}\n\n"

                assistant_tool_calls.append({
                    "id": tc_data["id"],
                    "type": "function",
                    "function": {"name": fn_name, "arguments": tc_data["args"]},
                })

                tool_content = (
                    json.dumps(result.result, default=str)
                    if result.status == "success"
                    else json.dumps({"error": result.error})
                )

                messages.append({"role": "tool", "tool_call_id": tc_data["id"], "content": tool_content})

            messages.insert(-len(tool_calls_dict), {"role": "assistant", "tool_calls": assistant_tool_calls})
            await asyncio.sleep(0.4)

        final_reply = "".join(full_reply_parts) or "Done."
        await _persist_messages(pool, session_id, body.message, final_reply)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

