"""
app/tools.py — Agent tool definitions for the CorpConnect AI Agent.

Each tool maps to a domain operation in the Next.js backend. Tool schemas
follow the OpenAI function-calling specification so they can be passed
directly to the LLM's `tools` parameter.

Tools are grouped by capability tier:
  - READ:  Available to all authenticated users (PRO+ plan)
  - WRITE: Available to members with write permissions
  - ADMIN: Available to org ADMIN/OWNER roles only
"""

from typing import Any

# ─── Tool Schema Helpers ──────────────────────────────────────────────────────

def _tool(name: str, description: str, parameters: dict) -> dict:
    """Build an OpenAI-compatible tool definition."""
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": parameters.get("properties", {}),
                "required": parameters.get("required", []),
            },
        },
    }


# ─── Phase 1: Read-Only Tools ────────────────────────────────────────────────

LIST_MY_EVENTS = _tool(
    name="list_my_events",
    description=(
        "List events that the user's organization is hosting. "
        "Returns upcoming events with title, date, location, and attendee count."
    ),
    parameters={
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Max number of events to return. Defaults to 10.",
            },
        },
        "required": [],
    },
)

GET_EVENT_DETAILS = _tool(
    name="get_event_details",
    description=(
        "Get full details of a specific event by its ID. "
        "Returns title, description, date, location, price, tags, and attendee count."
    ),
    parameters={
        "properties": {
            "eventId": {
                "type": "string",
                "description": "The UUID of the event to retrieve.",
            },
        },
        "required": ["eventId"],
    },
)

SEARCH_EVENTS = _tool(
    name="search_events",
    description=(
        "Search for events across the platform using natural language. "
        "Uses semantic (AI-powered) search to find relevant events."
    ),
    parameters={
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query (e.g. 'AI conferences in Mumbai').",
            },
            "limit": {
                "type": "integer",
                "description": "Max results to return. Defaults to 5.",
            },
        },
        "required": ["query"],
    },
)

GET_RECOMMENDATIONS = _tool(
    name="get_recommendations",
    description=(
        "Get AI-powered event or organization recommendations for the user. "
        "Use type='events' for event recommendations or type='orgs' for organization recommendations."
    ),
    parameters={
        "properties": {
            "type": {
                "type": "string",
                "enum": ["events", "orgs"],
                "description": "Whether to recommend events or organizations.",
            },
            "limit": {
                "type": "integer",
                "description": "Max recommendations to return. Defaults to 5.",
            },
        },
        "required": ["type"],
    },
)

GET_MY_PROFILE = _tool(
    name="get_my_profile",
    description=(
        "Fetch the current user's profile information including name, email, "
        "role in their active organization, and subscription plan."
    ),
    parameters={
        "properties": {},
        "required": [],
    },
)

GET_ORG_DETAILS = _tool(
    name="get_org_details",
    description=(
        "Get details about the user's active organization including name, "
        "description, services, technologies, tags, member count, and subscription plan."
    ),
    parameters={
        "properties": {},
        "required": [],
    },
)

GET_AI_USAGE_STATS = _tool(
    name="get_ai_usage_stats",
    description=(
        "Check the AI usage quota for the user's organization. "
        "Returns how many AI calls have been used, the total limit, and the current plan."
    ),
    parameters={
        "properties": {},
        "required": [],
    },
)


# ─── Phase 2: Write Tools ────────────────────────────────────────────────────

CREATE_EVENT = _tool(
    name="create_event",
    description=(
        "Create a new event for the user's organization. "
        "IMPORTANT: Always confirm the details with the user before creating. "
        "Returns the created event's ID and title."
    ),
    parameters={
        "properties": {
            "title": {
                "type": "string",
                "description": "The event title.",
            },
            "description": {
                "type": "string",
                "description": "A detailed event description.",
            },
            "location": {
                "type": "string",
                "description": "The event location (physical address or 'Online').",
            },
            "startDateTime": {
                "type": "string",
                "description": "ISO 8601 start date and time (e.g. '2026-08-20T09:00:00Z').",
            },
            "endDateTime": {
                "type": "string",
                "description": "ISO 8601 end date and time.",
            },
            "categoryId": {
                "type": "string",
                "description": "Category UUID. If not provided, the system will use a default.",
            },
            "isFree": {
                "type": "boolean",
                "description": "Whether the event is free. Defaults to true.",
            },
            "price": {
                "type": "number",
                "description": "Ticket price (only if isFree is false).",
            },
            "eventType": {
                "type": "string",
                "enum": ["ONLINE", "OFFLINE", "HYBRID"],
                "description": "The event format. Defaults to OFFLINE.",
            },
            "maxAttendees": {
                "type": "integer",
                "description": "Maximum number of attendees allowed.",
            },
        },
        "required": ["title", "description", "location", "startDateTime", "endDateTime"],
    },
)

UPDATE_EVENT = _tool(
    name="update_event",
    description=(
        "Update an existing event. Only provide the fields you want to change. "
        "IMPORTANT: Always confirm the changes with the user before updating."
    ),
    parameters={
        "properties": {
            "eventId": {
                "type": "string",
                "description": "The UUID of the event to update.",
            },
            "title": {"type": "string", "description": "New event title."},
            "description": {"type": "string", "description": "New event description."},
            "location": {"type": "string", "description": "New event location."},
            "startDateTime": {"type": "string", "description": "New ISO 8601 start date."},
            "endDateTime": {"type": "string", "description": "New ISO 8601 end date."},
        },
        "required": ["eventId"],
    },
)

DELETE_EVENT = _tool(
    name="delete_event",
    description=(
        "Delete an event permanently. This action CANNOT be undone. "
        "IMPORTANT: Always ask the user to explicitly confirm deletion before proceeding. "
        "Only organization ADMINs and OWNERs can delete events."
    ),
    parameters={
        "properties": {
            "eventId": {
                "type": "string",
                "description": "The UUID of the event to delete.",
            },
        },
        "required": ["eventId"],
    },
)

GENERATE_EVENT_DESCRIPTION = _tool(
    name="generate_event_description",
    description=(
        "Generate a polished, professional event description from a rough draft or key points. "
        "Uses RAG (retrieval-augmented generation) grounded in the organization's documents."
    ),
    parameters={
        "properties": {
            "roughDraft": {
                "type": "string",
                "description": "The rough draft or key points to expand into a full description.",
            },
            "eventId": {
                "type": "string",
                "description": "Optional event UUID for additional context.",
            },
        },
        "required": ["roughDraft"],
    },
)


LIST_NOTIFICATIONS = _tool(
    name="list_notifications",
    description="Fetch recent unread notifications for the user.",
    parameters={"properties": {}, "required": []},
)

SEND_EVENT_INVITES = _tool(
    name="send_event_invites",
    description="Send email invitations for an event to a list of target email addresses.",
    parameters={
        "properties": {
            "eventId": {"type": "string", "description": "The UUID of the event."},
            "emails": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of recipient email addresses.",
            },
        },
        "required": ["eventId", "emails"],
    },
)

# ─── Capability Tiers ─────────────────────────────────────────────────────────

# Tools available at each permission tier
READ_TOOLS = [
    LIST_MY_EVENTS,
    GET_EVENT_DETAILS,
    SEARCH_EVENTS,
    GET_RECOMMENDATIONS,
    GET_MY_PROFILE,
    GET_ORG_DETAILS,
    GET_AI_USAGE_STATS,
    LIST_NOTIFICATIONS,
]

WRITE_TOOLS = [
    CREATE_EVENT,
    UPDATE_EVENT,
    GENERATE_EVENT_DESCRIPTION,
    SEND_EVENT_INVITES,
]

ADMIN_TOOLS = [
    DELETE_EVENT,
]

# Lookup from tool name → the internal tool schema
ALL_TOOLS: dict[str, dict] = {}
for tool in READ_TOOLS + WRITE_TOOLS + ADMIN_TOOLS:
    ALL_TOOLS[tool["function"]["name"]] = tool


def get_tools_for_capabilities(capabilities: list[str]) -> list[dict]:
    """Return only the tool definitions that the user is authorised to use."""
    return [ALL_TOOLS[name] for name in capabilities if name in ALL_TOOLS]


# Tool name → tier mapping (used for server-side validation)
TOOL_TIERS: dict[str, str] = {}
for tool in READ_TOOLS:
    TOOL_TIERS[tool["function"]["name"]] = "READ"
for tool in WRITE_TOOLS:
    TOOL_TIERS[tool["function"]["name"]] = "WRITE"
for tool in ADMIN_TOOLS:
    TOOL_TIERS[tool["function"]["name"]] = "ADMIN"
