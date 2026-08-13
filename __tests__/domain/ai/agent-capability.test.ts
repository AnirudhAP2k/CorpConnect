import { getAgentCapabilities, isToolAuthorised } from "@/domain/ai/agent-capability";

describe("Agent Capability Scoping Module", () => {
    describe("getAgentCapabilities()", () => {
        it("should return an empty array for FREE plan users", () => {
            const capabilities = getAgentCapabilities("MEMBER", "FREE");
            expect(capabilities).toEqual([]);
        });

        it("should return READ and WRITE tools for PRO plan MEMBER users", () => {
            const capabilities = getAgentCapabilities("MEMBER", "PRO");
            expect(capabilities).toContain("list_my_events");
            expect(capabilities).toContain("get_event_details");
            expect(capabilities).toContain("search_events");
            expect(capabilities).toContain("discover_organizations");
            expect(capabilities).toContain("list_org_connections");
            expect(capabilities).toContain("list_attending_events");
            expect(capabilities).toContain("get_meeting_requests");
            expect(capabilities).toContain("get_org_dashboard_stats");
            expect(capabilities).toContain("list_org_members");
            expect(capabilities).toContain("list_pending_invites");
            expect(capabilities).toContain("get_billing_status");
            expect(capabilities).toContain("create_event");
            expect(capabilities).toContain("update_event");
            expect(capabilities).not.toContain("delete_event");
            expect(capabilities).not.toContain("send_event_invites");
        });

        it("should return ADMIN tools (delete_event) for PRO plan ADMIN users", () => {
            const capabilities = getAgentCapabilities("ADMIN", "PRO");
            expect(capabilities).toContain("delete_event");
            expect(capabilities).toContain("send_event_invites");
        });

        it("should return ADMIN tools (delete_event) for ENTERPRISE plan OWNER users", () => {
            const capabilities = getAgentCapabilities("OWNER", "ENTERPRISE");
            expect(capabilities).toContain("delete_event");
            expect(capabilities).toContain("create_event");
            expect(capabilities).toContain("send_event_invites");
        });
    });

    describe("isToolAuthorised()", () => {
        it("should return true if tool is in capability list", () => {
            const capabilities = ["list_my_events", "create_event"];
            expect(isToolAuthorised("create_event", capabilities)).toBe(true);
        });

        it("should return false if tool is not in capability list", () => {
            const capabilities = ["list_my_events"];
            expect(isToolAuthorised("delete_event", capabilities)).toBe(false);
        });
    });
});
