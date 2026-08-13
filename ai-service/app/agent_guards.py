"""
Safety guards for the CorpConnect AI Agent tool loop.

Prevents:
  - Meta "what can you do?" questions from triggering tool fan-out
  - Write/destructive tools running without explicit user confirmation
  - Multiple confirmation-required writes in a single request
"""

from __future__ import annotations

import re

# Side-effecting tools that must not run until the user affirms.
CONFIRMATION_REQUIRED_TOOLS: frozenset[str] = frozenset(
    {
        "create_event",
        "update_event",
        "delete_event",
        "send_event_invites",
    }
)

# Cap confirmation-required writes per user request (safety net).
MAX_CONFIRMATION_REQUIRED_WRITES_PER_REQUEST = 1

# Meta / capability-listing questions — answer from the prompt, do not call tools.
_META_CAPABILITIES_RE = re.compile(
    r"(?i)\b("
    r"what\s+can\s+(?:you|i)\s+do|"
    r"what\s+(?:actions?|tools?|capabilities?)\s+(?:can\s+)?(?:you|i)\s+(?:do|perform|use)|"
    r"list\s+(?:all\s+)?(?:the\s+)?(?:actions?|tools?|capabilities?)|"
    r"(?:actions?|tools?|capabilities?)\s+(?:can\s+)?(?:you|i)\s+perform|"
    r"how\s+can\s+you\s+help|"
    r"what\s+are\s+you\s+(?:able|capable)\s+to\s+do|"
    r"available\s+(?:actions?|tools?|capabilities?)"
    r")\b"
)

# Affirmative replies that unlock confirmation-required tools for this turn.
_WRITE_CONFIRM_RE = re.compile(
    r"(?i)^\s*("
    r"yes(?:[,\s].*)?|"
    r"yep|yeah|yup|"
    r"ok(?:ay)?(?:[,\s].*)?|"
    r"sure(?:[,\s].*)?|"
    r"confirm(?:ed)?(?:[,\s].*)?|"
    r"proceed(?:[,\s].*)?|"
    r"go\s+ahead(?:[,\s].*)?|"
    r"do\s+it(?:[,\s].*)?|"
    r"approved(?:[,\s].*)?|"
    r"please\s+proceed(?:[,\s].*)?|"
    r"please\s+do(?:[,\s].*)?"
    r")\s*$"
)


def is_meta_capabilities_question(message: str) -> bool:
    """True when the user is asking what the agent can do, not to perform work."""
    return bool(_META_CAPABILITIES_RE.search(message or ""))


def message_confirms_write(message: str) -> bool:
    """True when the user message is an explicit affirmative confirmation."""
    return bool(_WRITE_CONFIRM_RE.match((message or "").strip()))


def soft_fail_error_from_body(data: object) -> str | None:
    """
    Next.js tool handlers sometimes return HTTP 200 with
    ``{ "success": false, "error": "..." }``. Map that to an error string.
    """
    if isinstance(data, dict) and data.get("success") is False:
        err = data.get("error") or "Tool failed"
        return str(err)
    return None


def write_action_allowed(
    tool_name: str,
    *,
    user_message: str,
    tool_args: dict | None = None,
    writes_already_executed: int = 0,
) -> tuple[bool, str | None]:
    """
    Decide whether a confirmation-required write tool may execute.

    Confirmation must come from the **user message** on this turn.
    Model-supplied ``tool_args["confirm"]`` is intentionally ignored — the LLM
    can invent that field and must not be able to bypass human approval.

    Returns (allowed, denial_reason).
    Non-gated tools always return (True, None).
    """
    if tool_name not in CONFIRMATION_REQUIRED_TOOLS:
        return True, None

    # tool_args retained in the signature for call-site compatibility only.
    _ = tool_args

    if not message_confirms_write(user_message):
        return (
            False,
            (
                f"'{tool_name}' requires explicit user confirmation before it can run. "
                "Describe the planned action and ask the user to confirm "
                '(e.g. "yes" / "go ahead"), then call the tool only after they affirm.'
            ),
        )

    if writes_already_executed >= MAX_CONFIRMATION_REQUIRED_WRITES_PER_REQUEST:
        return (
            False,
            (
                f"Only {MAX_CONFIRMATION_REQUIRED_WRITES_PER_REQUEST} write action "
                "is allowed per user message. Ask the user before performing another."
            ),
        )

    return True, None
