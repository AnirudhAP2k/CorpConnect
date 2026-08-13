"""
tests/test_agent.py — Pytest suite for CorpConnect AI Agent tool resolution,
capability filtering, and runaway tool-fan-out guards.
"""

from app.agent_guards import (
    CONFIRMATION_REQUIRED_TOOLS,
    is_meta_capabilities_question,
    message_confirms_write,
    soft_fail_error_from_body,
    write_action_allowed,
)
from app.tools import (
    ALL_TOOLS,
    READ_TOOLS,
    WRITE_TOOLS,
    ADMIN_TOOLS,
    get_tools_for_capabilities,
)


def test_tool_registry_contains_all_capabilities():
    """Verify ALL_TOOLS dictionary contains all registered tools."""
    assert "list_my_events" in ALL_TOOLS
    assert "create_event" in ALL_TOOLS
    assert "delete_event" in ALL_TOOLS
    assert "search_events" in ALL_TOOLS
    assert "send_event_invites" in ALL_TOOLS
    assert "discover_organizations" in ALL_TOOLS
    assert "list_org_connections" in ALL_TOOLS
    assert "list_attending_events" in ALL_TOOLS
    assert "get_meeting_requests" in ALL_TOOLS
    assert "get_org_dashboard_stats" in ALL_TOOLS
    assert "list_org_members" in ALL_TOOLS
    assert "list_pending_invites" in ALL_TOOLS
    assert "get_billing_status" in ALL_TOOLS


def test_get_tools_for_capabilities_filters_correctly():
    """Verify tool definitions are filtered according to user capabilities."""
    user_caps = ["list_my_events", "search_events"]
    tools = get_tools_for_capabilities(user_caps)

    assert len(tools) == 2
    tool_names = [t["function"]["name"] for t in tools]
    assert "list_my_events" in tool_names
    assert "search_events" in tool_names
    assert "delete_event" not in tool_names


def test_tool_schemas_have_valid_structure():
    """Verify tool schemas conform to OpenAI function calling spec."""
    for tool_name, tool_def in ALL_TOOLS.items():
        assert tool_def["type"] == "function"
        assert "function" in tool_def
        fn = tool_def["function"]
        assert "name" in fn
        assert "description" in fn
        assert "parameters" in fn
        assert fn["parameters"]["type"] == "object"


def test_list_all_actions_is_meta_capabilities_question():
    """Regression: capability listing must be detected as meta (no tool calls)."""
    prompt = "list all the actions I can perform from this chatbot"
    assert is_meta_capabilities_question(prompt) is True


def test_meta_capabilities_variants():
    assert is_meta_capabilities_question("What can you do?") is True
    assert is_meta_capabilities_question("what tools can I use?") is True
    assert is_meta_capabilities_question("How can you help?") is True
    assert is_meta_capabilities_question("available capabilities") is True
    # Real work prompts must NOT disable tools
    assert is_meta_capabilities_question("Check AI usage quota") is False
    assert is_meta_capabilities_question("Can I create an event") is False
    assert is_meta_capabilities_question("list my events") is False


def test_meta_question_disables_tool_resolution_path():
    """When meta is detected, callers should pass an empty tool list (no fan-out)."""
    message = "list all the actions I can perform from this chatbot"
    caps = list(ALL_TOOLS.keys())
    tools = [] if is_meta_capabilities_question(message) else get_tools_for_capabilities(caps)
    assert tools == []


def test_write_tools_denied_without_confirmation():
    """Write/destructive tools must hard-deny without an affirmative user message."""
    for tool_name in CONFIRMATION_REQUIRED_TOOLS:
        allowed, reason = write_action_allowed(
            tool_name,
            user_message="list all the actions I can perform from this chatbot",
        )
        assert allowed is False
        assert reason is not None
        assert "confirmation" in reason.lower()


def test_write_tools_allowed_after_affirmative():
    allowed, reason = write_action_allowed(
        "create_event",
        user_message="Yes, go ahead",
    )
    assert allowed is True
    assert reason is None


def test_model_supplied_confirm_flag_is_ignored():
    """LLM-controlled tool_args.confirm must NOT bypass user confirmation."""
    allowed, reason = write_action_allowed(
        "delete_event",
        user_message="please delete that event for me",
        tool_args={"confirm": True, "eventId": "abc"},
    )
    assert allowed is False
    assert reason is not None
    assert "confirmation" in reason.lower()


def test_read_tools_not_gated():
    allowed, reason = write_action_allowed(
        "get_ai_usage_stats",
        user_message="Check AI usage quota",
    )
    assert allowed is True
    assert reason is None


def test_second_write_in_same_request_denied():
    allowed, reason = write_action_allowed(
        "send_event_invites",
        user_message="yes",
        writes_already_executed=1,
    )
    assert allowed is False
    assert reason is not None


def test_message_confirms_write_patterns():
    assert message_confirms_write("yes") is True
    assert message_confirms_write("Go ahead") is True
    assert message_confirms_write("confirm") is True
    assert message_confirms_write("Can I create an event") is False
    assert message_confirms_write("list all the actions I can perform") is False


def test_soft_fail_error_from_body_maps_unauthorized():
    """HTTP 200 + {success:false} must surface as a tool error string."""
    assert soft_fail_error_from_body({"success": False, "error": "Unauthorized"}) == "Unauthorized"
    assert soft_fail_error_from_body({"success": False}) == "Tool failed"
    assert soft_fail_error_from_body({"success": True, "data": {}}) is None
    assert soft_fail_error_from_body({"id": "evt-1"}) is None
    assert soft_fail_error_from_body([1, 2]) is None
