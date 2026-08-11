"""
tests/test_agent.py — Pytest suite for CorpConnect AI Agent tool resolution
and capability filtering.
"""

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
