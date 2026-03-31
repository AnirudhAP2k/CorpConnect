"""
routers/chat.py — POST /chat/message

Multi-context RAG chatbot with persistent conversation memory.

Each user gets one ChatSession per context (event or org). Messages are stored
in ChatMessage and replayed as history on subsequent turns (rolling 10-message
window), giving the LLM short-term memory without unbounded prompt growth.

RAG strategy — 5 parallel data sources per query:
  0. ENTITY FACTS (always included, no threshold)
       a. Events table: title, description, location, datetime, price, tags
       b. Organization table: name, description, services, technologies, tags
  1. EVENT_DESCRIPTION OrgDocument chunks  → FAQs, supplementary event docs
  2. COMPANY_DESCRIPTION OrgDocument chunks → org mission / profile docs
  3. LEGAL_COMPLIANCE OrgDocument chunks   → platform-wide policies
  4. Events.embedding similarity search    → related events by same org

Auth: require_master_jwt (internal Next.js server action calls only).
"""

import asyncio
import logging
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import get_pool
from app.embeddings import encode
from app.llm import is_llm_configured, get_llm_client
from app.config import settings
from app.middleware.auth import require_master_jwt

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])

# ─── Constants ────────────────────────────────────────────────────────────────

_HISTORY_LIMIT    = 10     # messages loaded as context (rolling window)
_TOP_K_EVENT      = 3      # OrgDocument chunks for EVENT_DESCRIPTION
_TOP_K_ORG        = 3      # OrgDocument chunks for COMPANY_DESCRIPTION
_TOP_K_LEGAL      = 2      # OrgDocument chunks for LEGAL_COMPLIANCE
_TOP_K_SIMILAR    = 2      # related Events from Events.embedding search
_MIN_SCORE        = 0.20   # minimum cosine similarity to include a chunk
_MAX_REPLY_TOKENS = 600


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    sessionId:   str = Field(..., description="Existing session UUID or 'new' to start fresh.")
    userId:      str
    contextId:   str = Field(..., description="eventId or orgId depending on contextType.")
    contextType: str = Field(..., pattern="^(EVENT|ORGANIZATION)$")
    message:     str = Field(..., min_length=1, max_length=1000)


class ChatMessageResponse(BaseModel):
    sessionId:  str
    reply:      str
    sourceDocs: list[str]   # chunk titles used — shown as badges in ChatWidget


# ─── DB helpers ───────────────────────────────────────────────────────────────

async def _resolve_session(pool, user_id: str, context_id: str, context_type: str) -> str:
    """
    Upsert a ChatSession for (userId, contextId, contextType).
    Returns the session UUID.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id FROM "ChatSession"
            WHERE "userId" = $1::uuid
              AND "contextId" = $2::uuid
              AND "contextType" = $3::"ChatContextType"
            """,
            user_id, context_id, context_type,
        )
        if row:
            # Touch updatedAt so the session stays fresh
            await conn.execute(
                'UPDATE "ChatSession" SET "updatedAt" = NOW() WHERE id = $1::uuid',
                str(row["id"]),
            )
            return str(row["id"])

        # Create new session
        new_id = str(uuid_lib.uuid4())
        await conn.execute(
            """
            INSERT INTO "ChatSession" (id, "userId", "contextId", "contextType", "createdAt", "updatedAt")
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::"ChatContextType", NOW(), NOW())
            """,
            new_id, user_id, context_id, context_type,
        )
        return new_id


async def _load_history(pool, session_id: str) -> list[dict]:
    """Load the last _HISTORY_LIMIT messages for the session, oldest first."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT role, content FROM "ChatMessage"
            WHERE "sessionId" = $1::uuid
            ORDER BY "createdAt" ASC
            LIMIT $2
            """,
            session_id, _HISTORY_LIMIT,
        )
    return [{"role": r["role"].lower(), "content": r["content"]} for r in rows]


async def _persist_messages(pool, session_id: str, user_content: str, assistant_content: str) -> None:
    """Insert the USER turn and ASSISTANT reply as a pair."""
    user_id    = str(uuid_lib.uuid4())
    ai_id      = str(uuid_lib.uuid4())
    async with pool.acquire() as conn:
        await conn.executemany(
            """
            INSERT INTO "ChatMessage" (id, "sessionId", role, content, "createdAt")
            VALUES ($1::uuid, $2::uuid, $3::"ChatRole", $4, NOW())
            """,
            [
                (user_id, session_id, "USER",      user_content),
                (ai_id,   session_id, "ASSISTANT", assistant_content),
            ],
        )


async def _get_org_id_for_event(pool, event_id: str) -> str | None:
    """Resolve the hosting org of an event (needed for COMPANY_DESCRIPTION lookup)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT "organizationId" FROM "Events" WHERE id = $1::uuid', event_id
        )
    return str(row["organizationId"]) if row else None


async def _get_context_name(pool, context_id: str, context_type: str) -> str:
    """Fetch a human-readable name for the context (event title or org name)."""
    async with pool.acquire() as conn:
        if context_type == "EVENT":
            row = await conn.fetchrow('SELECT title FROM "Events" WHERE id = $1::uuid', context_id)
            return row["title"] if row else "this event"
        else:
            row = await conn.fetchrow('SELECT name FROM "Organization" WHERE id = $1::uuid', context_id)
            return row["name"] if row else "this organization"


# ─── Entity-level context fetchers (structured DB data, no threshold) ─────────

async def _fetch_event_entity_context(pool, event_id: str) -> str:
    """
    Fetch the event's core structured fields and all its tags directly by ID.
    This is ALWAYS included in the prompt (no similarity threshold) because
    we know exactly which event we're chatting about.
    Returns a pre-formatted text block ready for the system prompt.
    """
    async with pool.acquire() as conn:
        event = await conn.fetchrow(
            """
            SELECT e.title, e.description, e.location,
                   e."startDateTime", e."endDateTime",
                   e.price, e."isFree", e.url,
                   e."eventType", e."maxAttendees", e."attendeeCount",
                   e.visibility,
                   array_agg(t.label ORDER BY t.label) FILTER (WHERE t.label IS NOT NULL) AS tags
            FROM "Events" e
            LEFT JOIN "EventTag" et ON et."eventId" = e.id
            LEFT JOIN "Tag" t      ON t.id = et."tagId"
            WHERE e.id = $1::uuid
            GROUP BY e.id
            """,
            event_id,
        )
    if not event:
        return "Event details not available."

    from datetime import timezone

    def fmt_dt(dt):
        if dt is None:
            return "TBD"
        if hasattr(dt, 'strftime'):
            return dt.strftime("%A, %d %B %Y at %I:%M %p")
        return str(dt)

    price_info = "Free" if event["isFree"] else (f"${event['price']}" if event["price"] else "Paid (price not listed)")
    capacity   = f"{event['attendeeCount']}/{event['maxAttendees']} registered" if event["maxAttendees"] else "Unlimited"
    tags_list  = ", ".join(event["tags"]) if event["tags"] else "None"
    url_info   = event["url"] if event["url"] else "Not provided"

    return f"""Title: {event['title']}
Description: {event['description']}
Location: {event['location']}
Start: {fmt_dt(event['startDateTime'])}
End: {fmt_dt(event['endDateTime'])}
Event Type: {event['eventType']}
Price: {price_info}
Capacity: {capacity}
Visibility: {event['visibility']}
Event URL: {url_info}
Tags: {tags_list}"""


async def _fetch_org_entity_context(pool, org_id: str) -> str:
    """
    Fetch the organization's structured fields and its tags directly by ID.
    ALWAYS included — provides ground-truth facts about the hosting organization.
    """
    async with pool.acquire() as conn:
        org = await conn.fetchrow(
            """
            SELECT o.name, o.description, o.website, o.location,
                   o.size, o."hiringStatus", o."linkedinUrl",
                   o."partnershipInterests", o.services, o.technologies,
                   o."isVerified",
                   array_agg(t.label ORDER BY t.label) FILTER (WHERE t.label IS NOT NULL) AS tags
            FROM "Organization" o
            LEFT JOIN "OrgTag" ot ON ot."orgId" = o.id
            LEFT JOIN "Tag" t    ON t.id = ot."tagId"
            WHERE o.id = $1::uuid
            GROUP BY o.id
            """,
            org_id,
        )
    if not org:
        return "Organization details not available."

    tags_list      = ", ".join(org["tags"]) if org["tags"] else "None"
    services       = ", ".join(org["services"]) if org["services"] else "Not listed"
    technologies   = ", ".join(org["technologies"]) if org["technologies"] else "Not listed"
    partnerships   = ", ".join(org["partnershipInterests"]) if org["partnershipInterests"] else "Not listed"
    verified_badge = " ✓ Verified" if org["isVerified"] else ""

    return f"""Name: {org['name']}{verified_badge}
Description: {org['description'] or 'Not provided'}
Location: {org['location'] or 'Not provided'}
Website: {org['website'] or 'Not provided'}
LinkedIn: {org['linkedinUrl'] or 'Not provided'}
Size: {org['size']}
Hiring Status: {org['hiringStatus']}
Services: {services}
Technologies: {technologies}
Partnership Interests: {partnerships}
Tags: {tags_list}"""


async def _retrieve_similar_events(
    pool,
    query_vector: list[float],
    org_id: str,
    exclude_event_id: str | None,
    top_k: int,
) -> list[dict]:
    """
    Use the pre-computed Events.embedding column to find semantically related
    events from the same organization as the current context.
    Useful for: "Are there similar events?", "What else does this org host?"
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT title,
                   description,
                   location,
                   "startDateTime",
                   "isFree",
                   price,
                   1 - (embedding <=> $1) AS score
            FROM "Events"
            WHERE embedding IS NOT NULL
              AND "organizationId" = $2::uuid
              AND ($3::uuid IS NULL OR id != $3::uuid)
              AND 1 - (embedding <=> $1) >= {_MIN_SCORE}
            ORDER BY embedding <=> $1
            LIMIT $4
            """,
            query_vector, org_id, exclude_event_id, top_k,
        )
    results = []
    for r in rows:
        price_str = "Free" if r["isFree"] else (f"${r['price']}" if r["price"] else "Paid")
        start_str = r["startDateTime"].strftime("%d %b %Y") if r["startDateTime"] else "TBD"
        results.append({
            "title":   r["title"],
            "content": f"{r['description']} | Location: {r['location']} | Date: {start_str} | Price: {price_str}",
        })
    return results


# ─── RAG retrieval ────────────────────────────────────────────────────────────

async def _retrieve_doc_chunks(
    pool,
    query_vector: list[float],
    org_id: str | None,
    doc_types: list[str],
    top_k: int,
) -> list[dict]:
    """Retrieve top-K OrgDocument chunks by cosine similarity."""
    if not org_id and "LEGAL_COMPLIANCE" not in doc_types:
        return []

    async with pool.acquire() as conn:
        if org_id:
            rows = await conn.fetch(
                f"""
                SELECT title, content,
                       1 - (embedding <=> $1) AS score
                FROM "OrgDocument"
                WHERE embedding IS NOT NULL
                  AND "docType"::text = ANY($3::text[])
                  AND ("organizationId" = $2::uuid OR "organizationId" IS NULL)
                  AND 1 - (embedding <=> $1) >= {_MIN_SCORE}
                ORDER BY embedding <=> $1
                LIMIT $4
                """,
                query_vector, org_id, doc_types, top_k,
            )
        else:
            # Platform-wide docs only (LEGAL_COMPLIANCE)
            rows = await conn.fetch(
                f"""
                SELECT title, content,
                       1 - (embedding <=> $1) AS score
                FROM "OrgDocument"
                WHERE embedding IS NOT NULL
                  AND "docType"::text = ANY($2::text[])
                  AND "organizationId" IS NULL
                  AND 1 - (embedding <=> $1) >= {_MIN_SCORE}
                ORDER BY embedding <=> $1
                LIMIT $3
                """,
                query_vector, doc_types, top_k,
            )
    return [dict(r) for r in rows]


def _format_context_block(label: str, docs: list[dict]) -> str:
    if not docs:
        return f"[{label}]\nNo relevant documents available.\n"
    chunks = "\n---\n".join(f"Source: {d['title']}\n{d['content']}" for d in docs)
    return f"[{label}]\n{chunks}\n"


async def _noop() -> list:
    """Async no-op returning an empty list (replaces deprecated asyncio.coroutine)."""
    return []


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post(
    "/message",
    response_model=ChatMessageResponse,
    summary="Send a chat message to the RAG-powered AI concierge",
)
async def chat_message(body: ChatMessageRequest):
    """
    Accept a user message, retrieve relevant OrgDocument context via pgvector,
    build a grounded prompt with conversation history, call the LLM, persist
    both turns, and return the assistant's reply with source doc transparency.
    """
    if not is_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="LLM is not configured. Set LLM_API_KEY in ai-service/.env.",
        )

    pool = get_pool()

    # ── 1. Resolve / create session ───────────────────────────────────────────
    session_id = await _resolve_session(pool, body.userId, body.contextId, body.contextType)

    # ── 2. Load conversation history ─────────────────────────────────────────
    history = await _load_history(pool, session_id)

    # ── 3. Resolve orgId (needed for RAG regardless of context type) ─────────
    if body.contextType == "EVENT":
        org_id = await _get_org_id_for_event(pool, body.contextId)
    else:
        org_id = body.contextId

    context_name = await _get_context_name(pool, body.contextId, body.contextType)

    # ── 4. Embed query + run 5 parallel data retrievals ───────────────────────
    query_vector: list[float] = encode(body.message)

    # 4a. Entity-level facts (always fetched directly by ID, no similarity gate)
    if body.contextType == "EVENT":
        event_entity_task        = _fetch_event_entity_context(pool, body.contextId)
        similar_events_task      = _retrieve_similar_events(
            pool, query_vector, org_id, body.contextId, _TOP_K_SIMILAR
        ) if org_id else _noop()
        org_entity_task          = _fetch_org_entity_context(pool, org_id) if org_id else _noop()
    else:
        # ORGANIZATION context — no specific event; find semantically related events
        event_entity_task        = _noop()
        similar_events_task      = _retrieve_similar_events(
            pool, query_vector, org_id, None, _TOP_K_SIMILAR
        ) if org_id else _noop()
        org_entity_task          = _fetch_org_entity_context(pool, org_id)

    # 4b. OrgDocument RAG chunks (similarity-gated)
    event_docs_task = _retrieve_doc_chunks(
        pool, query_vector, org_id, ["EVENT_DESCRIPTION"], _TOP_K_EVENT
    ) if body.contextType == "EVENT" else _noop()

    org_docs_task = _retrieve_doc_chunks(
        pool, query_vector, org_id, ["COMPANY_DESCRIPTION"], _TOP_K_ORG
    )

    legal_docs_task = _retrieve_doc_chunks(
        pool, query_vector, None, ["LEGAL_COMPLIANCE"], _TOP_K_LEGAL
    )

    (
        event_entity_text,
        org_entity_text,
        similar_events,
        event_docs,
        org_docs,
        legal_docs,
    ) = await asyncio.gather(
        event_entity_task,
        org_entity_task,
        similar_events_task,
        event_docs_task,
        org_docs_task,
        legal_docs_task,
    )

    # Flatten all OrgDocument sources for transparency badges
    all_rag_docs  = list(event_docs) + list(org_docs) + list(legal_docs)
    source_titles = [d["title"] for d in all_rag_docs]
    if similar_events:
        source_titles += [f"Related event: {e['title']}" for e in similar_events]

    # ── 5. Build grounded system prompt ──────────────────────────────────────
    #
    # Priority order (LLM reads top-to-bottom):
    #   1. ENTITY FACTS   — ground-truth structured data from Events / Organization
    #   2. EVENT DOCS     — supplementary OrgDocument chunks (EVENT_DESCRIPTION)
    #   3. ORG PROFILE    — OrgDocument chunks (COMPANY_DESCRIPTION)
    #   4. SIMILAR EVENTS — Events.embedding similarity results
    #   5. PLATFORM POLICIES — LEGAL_COMPLIANCE OrgDocument chunks

    # Build entity facts block (string for EVENT, string for ORG)
    entity_block = ""
    if body.contextType == "EVENT" and isinstance(event_entity_text, str):
        entity_block = f"[EVENT FACTS — authoritative, always trust this]\n{event_entity_text}\n"
        if isinstance(org_entity_text, str):
            entity_block += f"\n[HOSTING ORGANIZATION FACTS]\n{org_entity_text}\n"
    elif isinstance(org_entity_text, str):
        entity_block = f"[ORGANIZATION FACTS — authoritative, always trust this]\n{org_entity_text}\n"

    similar_block = ""
    if similar_events:
        similar_items = "\n---\n".join(
            f"Event: {e['title']}\n{e['content']}" for e in similar_events
        )
        similar_block = f"[RELATED EVENTS BY SAME ORGANIZATION]\n{similar_items}\n"

    context_section = "\n".join(filter(bool, [
        entity_block,
        _format_context_block("SUPPLEMENTARY EVENT DOCUMENTS", list(event_docs)),
        _format_context_block("ORGANIZATION PROFILE DOCUMENTS", list(org_docs)),
        similar_block,
        _format_context_block("PLATFORM POLICIES",             list(legal_docs)),
    ]))

    system_prompt = f"""You are a helpful AI assistant for "{context_name}" on the CorpConnect platform.

Your role: Answer questions from attendees and members accurately and professionally.

RULES:
- Answer ONLY based on the context documents and conversation history below.
- The EVENT FACTS and ORGANIZATION FACTS blocks are the most authoritative source — always prefer them over other blocks when there is a conflict.
- If the answer is not in the context, say: "I don't have that information right now. Please contact the organizer directly."
- Be concise (2-4 sentences max unless a longer answer is clearly needed).
- Do NOT make up dates, prices, names, or contact details.
- Maintain a friendly, professional tone.

CONTEXT DOCUMENTS:
{context_section}"""

    # ── 6. Build messages array with history ─────────────────────────────────
    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": body.message},
    ]

    # ── 7. Call LLM ──────────────────────────────────────────────────────────
    client = get_llm_client()
    completion = await client.chat.completions.create(
        model=settings.LLM_MODEL_NAME,
        messages=messages,
        max_tokens=_MAX_REPLY_TOKENS,
        temperature=0.3,
    )
    reply = completion.choices[0].message.content or "I'm sorry, I couldn't generate a response. Please try again."

    # ── 8. Persist both turns ─────────────────────────────────────────────────
    await _persist_messages(pool, session_id, body.message, reply)

    logger.info(
        "💬 Chat response for session=%s context=%s/%s | entity=%s rag_docs=%d similar=%d",
        session_id[:8], body.contextType, body.contextId[:8],
        "yes", len(all_rag_docs), len(similar_events) if isinstance(similar_events, list) else 0,
    )

    return ChatMessageResponse(
        sessionId=session_id,
        reply=reply,
        sourceDocs=source_titles,
    )


@router.get(
    "/history/{session_id}",
    summary="Fetch message history for a chat session",
)
async def get_chat_history(session_id: str):
    """Return all messages in a session ordered oldest-first (for widget initial load)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, role, content, "createdAt"
            FROM "ChatMessage"
            WHERE "sessionId" = $1::uuid
            ORDER BY "createdAt" ASC
            """,
            session_id,
        )
    return [
        {
            "id":        str(r["id"]),
            "role":      r["role"].lower(),
            "content":   r["content"],
            "createdAt": r["createdAt"].isoformat(),
        }
        for r in rows
    ]
