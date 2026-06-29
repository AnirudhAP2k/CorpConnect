"""
routers/brainstorm.py — POST /chat/brainstorm/message
                         POST /chat/brainstorm/brief

Enterprise AI Event Brainstorming Assistant.

Flow:
  1. Member sends chat messages to /chat/brainstorm/message — a stateful
     conversation with a specialist LLM persona that helps flesh out event ideas.
  2. Once the member is happy, they call /chat/brainstorm/brief which replays
     the conversation history and asks the LLM to extract a structured event brief.
  3. The brief JSON is returned to the Next.js layer where it pre-fills the
     EventPitch form before the member pitches it to their admin.

Auth: require_master_jwt (internal Next.js server action calls only).
Enterprise gate is enforced at the Next.js domain layer before calling this service.
"""

import json
import logging
import re
import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import get_pool
from app.llm import is_llm_configured, get_llm_client
from app.config import settings
from app.middleware.auth import require_master_jwt

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])

# ─── Constants ────────────────────────────────────────────────────────────────

_HISTORY_LIMIT   = 12   # rolling conversation window for brainstorm sessions
_MAX_CHAT_TOKENS = 700
_MAX_BRIEF_TOKENS = 1200

# ─── Brainstorm System Prompt ─────────────────────────────────────────────────

_BRAINSTORM_SYSTEM_PROMPT = """\
You are an expert enterprise event strategist and creative consultant for CorpConnect, \
a B2B networking platform. Your role is to help organization members brainstorm and \
refine event ideas through a structured conversation.

Your personality:
- Energetic, concise, and action-oriented
- Ask focused follow-up questions one at a time
- Push for specific, measurable details (dates, budgets, audience size, agenda items)
- Offer creative suggestions grounded in B2B networking best practices

Topics to explore through conversation (don't ask all at once — let the conversation flow):
- Core purpose of the event (networking, learning, product demo, partnership building)
- Target audience (industry, seniority level, company size)
- Format (keynote + panels, workshop, roundtable, hackathon, social mixer)
- Venue type (in-person, virtual, hybrid) and approximate location
- Duration and tentative dates
- Key agenda items or session topics
- Estimated budget range
- Success metrics (attendance, leads generated, partnerships formed)

IMPORTANT: Keep responses under 150 words. Be conversational, not exhaustive. \
Do NOT try to summarize the whole brief until the user asks you to."""

# ─── Brief Extraction Prompt ──────────────────────────────────────────────────

_BRIEF_EXTRACTION_PROMPT = """\
Based on the brainstorming conversation above, extract a structured event brief.
Return ONLY a valid JSON object — no markdown fences, no extra text.

Required fields:
{
  "title":            "<concise event title, max 80 chars>",
  "description":      "<rich 2-3 sentence event description for the pitch>",
  "targetAudience":   "<who this event is for>",
  "location":         "<city/venue or 'Virtual' or null if unknown>",
  "estimatedBudget":  <budget in USD as a number, or null if unknown>,
  "agenda": [
    {"time": "<optional time slot>", "item": "<agenda item description>"}
  ],
  "startDateTime":    "<ISO 8601 datetime or null if not yet decided>",
  "endDateTime":      "<ISO 8601 datetime or null if not yet decided>",
  "aiBrief":          "<markdown summary of the event idea, 200-400 words, suitable for an admin pitch>"
}

If information for a field is missing from the conversation, use null for that field.
Infer reasonable defaults for the agenda if key topics were discussed.
The aiBrief field must be compelling and professional — it will be shown directly to the org admin."""

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class BrainstormMessageRequest(BaseModel):
    sessionId:      str = Field(..., description="UUID of the brainstorm session, or 'new' to start fresh")
    userId:         str = Field(..., description="UUID of the requesting user")
    organizationId: str = Field(..., description="UUID of the user's active organization")
    message:        str = Field(..., min_length=1, max_length=2000)


class BrainstormMessageResponse(BaseModel):
    sessionId: str
    reply:     str


class BriefRequest(BaseModel):
    sessionId:      str = Field(..., description="UUID of the brainstorm session to extract brief from")
    userId:         str
    organizationId: str


class EventBrief(BaseModel):
    title:           str
    description:     str
    targetAudience:  str | None = None
    location:        str | None = None
    estimatedBudget: float | None = None
    agenda:          list[dict] = []
    startDateTime:   str | None = None
    endDateTime:     str | None = None
    aiBrief:         str


class BriefResponse(BaseModel):
    sessionId: str
    brief:     EventBrief


# ─── DB Helpers ───────────────────────────────────────────────────────────────

async def _ensure_brainstorm_session(
    pool,
    user_id: str,
    org_id: str,
    session_id_hint: str,
) -> str:
    """
    Upsert a ChatSession for ORGANIZATION context (reusing the existing ChatSession table).
    Returns the resolved session UUID.
    """
    # If client provides an explicit existing session ID, verify it belongs to the user
    if session_id_hint and session_id_hint != "new":
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id FROM "ChatSession"
                WHERE id = $1::uuid AND "userId" = $2::uuid
                """,
                session_id_hint, user_id,
            )
            if row:
                return str(row["id"])

    # Create a new brainstorm session tagged with contextType=ORGANIZATION + org as context
    session_id = str(uuid_lib.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO "ChatSession" (id, "userId", "contextId", "contextType", "createdAt", "updatedAt")
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'ORGANIZATION', NOW(), NOW())
            ON CONFLICT DO NOTHING
            """,
            session_id, user_id, org_id,
        )
    return session_id


async def _load_history(pool, session_id: str) -> list[dict]:
    """Load the rolling conversation history for a brainstorm session."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content
            FROM "ChatMessage"
            WHERE "sessionId" = $1::uuid
            ORDER BY "createdAt" DESC
            LIMIT $2
            """,
            session_id, _HISTORY_LIMIT,
        )
    # Reverse to chronological order
    return [{"role": r["role"].lower(), "content": r["content"]} for r in reversed(rows)]


async def _save_message(pool, session_id: str, role: str, content: str) -> None:
    """Persist a single chat message to the ChatMessage table."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO "ChatMessage" (id, "sessionId", role, content, "createdAt")
            VALUES (gen_random_uuid(), $1::uuid, $2::"ChatRole", $3, NOW())
            """,
            session_id, role.upper(), content,
        )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/message", response_model=BrainstormMessageResponse)
async def brainstorm_message(
    req: BrainstormMessageRequest,
    pool=Depends(get_pool),
):
    """
    Send a chat message to the brainstorm assistant and receive a reply.
    Maintains full conversation history for multi-turn brainstorming.
    """
    if not is_llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured on AI service.")

    # 1. Resolve / create session
    session_id = await _ensure_brainstorm_session(
        pool, req.userId, req.organizationId, req.sessionId
    )

    # 2. Load conversation history
    history = await _load_history(pool, session_id)

    # 3. Persist the user's message
    await _save_message(pool, session_id, "USER", req.message)

    # 4. Build the LLM message list
    llm_messages = [{"role": "system", "content": _BRAINSTORM_SYSTEM_PROMPT}]
    llm_messages.extend(history)
    llm_messages.append({"role": "user", "content": req.message})

    # 5. Call LLM
    try:
        client = get_llm_client()
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=llm_messages,
            temperature=0.7,
            max_tokens=_MAX_CHAT_TOKENS,
        )
        reply = response.choices[0].message.content or ""
    except Exception as e:
        logger.exception("LLM call failed in brainstorm/message: %s", e)
        raise HTTPException(status_code=502, detail="LLM request failed.")

    # 6. Persist assistant reply
    await _save_message(pool, session_id, "ASSISTANT", reply)

    logger.info("[brainstorm/message] session=%s user=%s", session_id, req.userId)
    return BrainstormMessageResponse(sessionId=session_id, reply=reply)


@router.post("/brief", response_model=BriefResponse)
async def brainstorm_brief(
    req: BriefRequest,
    pool=Depends(get_pool),
):
    """
    Extract a structured event brief from the full brainstorm conversation history.
    Call this when the user is ready to pitch the idea to their admin.
    """
    if not is_llm_configured():
        raise HTTPException(status_code=503, detail="LLM not configured on AI service.")

    # 1. Verify session ownership
    async with pool.acquire() as conn:
        session_row = await conn.fetchrow(
            'SELECT id FROM "ChatSession" WHERE id = $1::uuid AND "userId" = $2::uuid',
            req.sessionId, req.userId,
        )
    if not session_row:
        raise HTTPException(status_code=404, detail="Brainstorm session not found.")

    # 2. Load full history (no limit — we need everything for accurate extraction)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content FROM "ChatMessage"
            WHERE "sessionId" = $1::uuid
            ORDER BY "createdAt" ASC
            """,
            req.sessionId,
        )
    history = [{"role": r["role"].lower(), "content": r["content"]} for r in rows]

    if len(history) < 2:
        raise HTTPException(
            status_code=422,
            detail="Not enough conversation history to generate a brief. Continue brainstorming first."
        )

    # 3. Build extraction prompt — append the brief extraction instruction as the final user turn
    llm_messages = [{"role": "system", "content": _BRAINSTORM_SYSTEM_PROMPT}]
    llm_messages.extend(history)
    llm_messages.append({"role": "user", "content": _BRIEF_EXTRACTION_PROMPT})

    # 4. Call LLM with lower temperature for deterministic JSON extraction
    try:
        client = get_llm_client()
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=llm_messages,
            temperature=0.1,
            max_tokens=_MAX_BRIEF_TOKENS,
        )
        raw = response.choices[0].message.content or ""
    except Exception as e:
        logger.exception("LLM call failed in brainstorm/brief: %s", e)
        raise HTTPException(status_code=502, detail="LLM request failed.")

    # 5. Parse JSON — strip any accidental markdown fences
    clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
    try:
        data = json.loads(clean)
    except json.JSONDecodeError as e:
        logger.error("Brief JSON parse failed: %s\nRaw LLM output:\n%s", e, raw)
        raise HTTPException(
            status_code=502,
            detail="AI returned an invalid brief format. Please try again."
        )

    # 6. Validate and build response model
    try:
        brief = EventBrief(
            title=data.get("title", "Untitled Event"),
            description=data.get("description", ""),
            targetAudience=data.get("targetAudience"),
            location=data.get("location"),
            estimatedBudget=data.get("estimatedBudget"),
            agenda=data.get("agenda", []),
            startDateTime=data.get("startDateTime"),
            endDateTime=data.get("endDateTime"),
            aiBrief=data.get("aiBrief", ""),
        )
    except Exception as e:
        logger.error("Brief model validation failed: %s", e)
        raise HTTPException(status_code=502, detail="AI returned an unexpected brief structure.")

    logger.info("[brainstorm/brief] session=%s user=%s title=%s", req.sessionId, req.userId, brief.title)
    return BriefResponse(sessionId=req.sessionId, brief=brief)


# ─── Tasklist Generation ──────────────────────────────────────────────────────

_TASKLIST_SYSTEM_PROMPT = """\
You are an expert enterprise event operations manager for CorpConnect, a B2B networking platform.
Your task is to generate a concrete, actionable operational milestone checklist for an upcoming event.

Guidelines:
- Generate between 10 and 18 tasks covering the full event lifecycle
- Organize tasks chronologically (pre-event preparation → event day → post-event)
- Use dueDayOffset (integer): negative = days BEFORE event start, 0 = event day, positive = days AFTER
- Priority: 1 = High (must-do, blocks other tasks), 2 = Medium, 3 = Low (nice-to-have)
- assignedRole: a short role label like "Admin", "Marketing", "Venue Team", "Tech Team", "Speakers Liaison", "Finance"
- Keep each task title short (max 80 chars), description practical and specific (1-2 sentences)
- Return ONLY a valid JSON array — no markdown fences, no extra text.

Required JSON format:
[
  {
    "title": "<task title>",
    "description": "<practical description>",
    "dueDayOffset": <integer>,
    "priority": <1, 2, or 3>,
    "assignedRole": "<role>"
  }
]"""


class TasklistRequest(BaseModel):
    pitchId:        str = Field(..., description="UUID of the approved EventPitch")
    title:          str = Field(..., description="Event title")
    description:    str = Field(..., description="Event description")
    targetAudience: str | None = None
    location:       str | None = None
    estimatedBudget: float | None = None
    startDateTime:  str | None = None
    endDateTime:    str | None = None
    aiBrief:        str = Field(..., description="Full AI brief markdown")


class TasklistTask(BaseModel):
    title:          str
    description:    str | None = None
    dueDayOffset:   int = 0
    priority:       int = 2  # 1=High, 2=Medium, 3=Low
    assignedRole:   str | None = None


class TasklistResponse(BaseModel):
    pitchId: str
    tasks:   list[TasklistTask]


# Deterministic fallback for when LLM is unavailable
def _fallback_tasklist(pitch_id: str) -> TasklistResponse:
    return TasklistResponse(
        pitchId=pitch_id,
        tasks=[
            TasklistTask(title="Confirm event venue and date", dueDayOffset=-45, priority=1, assignedRole="Admin", description="Book and confirm the physical or virtual event space."),
            TasklistTask(title="Define event goals and KPIs", dueDayOffset=-42, priority=1, assignedRole="Admin", description="Agree on measurable outcomes: attendance, leads, partnerships."),
            TasklistTask(title="Create event landing page", dueDayOffset=-35, priority=1, assignedRole="Marketing", description="Design and publish the public registration page on CorpConnect."),
            TasklistTask(title="Launch email campaign to target audience", dueDayOffset=-30, priority=1, assignedRole="Marketing", description="Send initial invitation emails to curated prospect list."),
            TasklistTask(title="Confirm speakers / panelists", dueDayOffset=-28, priority=1, assignedRole="Speakers Liaison", description="Lock in all confirmed speakers and share agenda with them."),
            TasklistTask(title="Finalize catering / AV setup", dueDayOffset=-21, priority=2, assignedRole="Venue Team", description="Confirm catering orders and audiovisual equipment requirements."),
            TasklistTask(title="Send reminder to registered attendees", dueDayOffset=-7, priority=2, assignedRole="Marketing", description="Automated reminder email with logistics details and agenda."),
            TasklistTask(title="Conduct rehearsal / tech check", dueDayOffset=-1, priority=1, assignedRole="Tech Team", description="Full dry run of presentation tech, video conferencing, and slides."),
            TasklistTask(title="On-site registration and welcome", dueDayOffset=0, priority=1, assignedRole="Admin", description="Staff check-in desk and welcome attendees as they arrive."),
            TasklistTask(title="Facilitate networking sessions", dueDayOffset=0, priority=2, assignedRole="Admin", description="Run structured networking breaks and intro sessions."),
            TasklistTask(title="Collect attendee feedback", dueDayOffset=0, priority=1, assignedRole="Admin", description="Distribute post-event feedback forms via CorpConnect."),
            TasklistTask(title="Send thank-you emails to attendees", dueDayOffset=1, priority=2, assignedRole="Marketing", description="Personalized follow-up with recordings/resources where applicable."),
            TasklistTask(title="Compile leads and connection data", dueDayOffset=2, priority=1, assignedRole="Admin", description="Export meeting requests and new org connections from CorpConnect dashboard."),
            TasklistTask(title="Review post-event analytics report", dueDayOffset=3, priority=1, assignedRole="Admin", description="Analyze the AI-generated post-event analytics report when available."),
            TasklistTask(title="Debrief with team and document lessons learned", dueDayOffset=5, priority=2, assignedRole="Admin", description="Internal retrospective meeting — document what worked and what to improve."),
        ],
    )


@router.post("/tasklist", response_model=TasklistResponse)
async def brainstorm_tasklist(
    req: TasklistRequest,
    pool=Depends(get_pool),
):
    """
    Generate an operational milestone tasklist for an approved event pitch.
    Called automatically by the Next.js job processor on pitch approval.
    """
    if not is_llm_configured():
        logger.warning("[brainstorm/tasklist] LLM not configured — using fallback tasklist")
        return _fallback_tasklist(req.pitchId)

    # Build a rich context prompt from the pitch details
    context_parts = [f"Event Title: {req.title}", f"Description: {req.description}"]
    if req.targetAudience:
        context_parts.append(f"Target Audience: {req.targetAudience}")
    if req.location:
        context_parts.append(f"Location: {req.location}")
    if req.estimatedBudget:
        context_parts.append(f"Estimated Budget: ${req.estimatedBudget:,.0f} USD")
    if req.startDateTime:
        context_parts.append(f"Event Start Date: {req.startDateTime}")
    if req.endDateTime:
        context_parts.append(f"Event End Date: {req.endDateTime}")
    if req.aiBrief:
        context_parts.append(f"\nFull Event Brief:\n{req.aiBrief}")

    user_prompt = "\n".join(context_parts) + "\n\nGenerate the operational milestone checklist for this event."

    try:
        client = get_llm_client()
        response = await client.chat.completions.create(
            model=settings.LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": _TASKLIST_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
        )
        raw = response.choices[0].message.content or ""
    except Exception as e:
        logger.exception("LLM call failed in brainstorm/tasklist: %s", e)
        return _fallback_tasklist(req.pitchId)

    # Strip markdown fences if present
    clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
    try:
        items = json.loads(clean)
        if not isinstance(items, list):
            raise ValueError("Expected JSON array")
        tasks = [
            TasklistTask(
                title=item.get("title", "Task"),
                description=item.get("description"),
                dueDayOffset=int(item.get("dueDayOffset", 0)),
                priority=int(item.get("priority", 2)),
                assignedRole=item.get("assignedRole"),
            )
            for item in items
        ]
    except Exception as e:
        logger.error("Tasklist JSON parse failed: %s\nRaw:\n%s", e, raw)
        return _fallback_tasklist(req.pitchId)

    logger.info("[brainstorm/tasklist] pitchId=%s tasks=%d", req.pitchId, len(tasks))
    return TasklistResponse(pitchId=req.pitchId, tasks=tasks)
