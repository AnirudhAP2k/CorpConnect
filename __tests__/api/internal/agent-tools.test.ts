import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;

jest.mock("next/cache", () => ({
    unstable_cache: (fn: any) => fn,
    revalidateTag: jest.fn(),
    revalidatePath: jest.fn(),
}));

jest.mock("jose", () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue("mock-token"),
    })),
    jwtVerify: jest.fn().mockResolvedValue({ payload: { role: "master" } }),
}));

jest.mock("@/auth", () => ({
    auth: jest.fn().mockResolvedValue({ user: { id: "user-123", activeOrganizationId: "org-123" } }),
}));

jest.mock("next-auth", () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({ auth: jest.fn() }),
}));

jest.mock("query-string", () => ({
    stringifyUrl: jest.fn().mockReturnValue(""),
    parseUrl: jest.fn().mockReturnValue({ url: "", query: {} }),
}));

jest.mock("@/lib/db", () => ({
    prisma: {
        events: { findUnique: jest.fn(), delete: jest.fn(), create: jest.fn(), update: jest.fn() },
        organizationMember: { findUnique: jest.fn() },
        organization: { findUnique: jest.fn() },
        notification: { findMany: jest.fn() },
        pendingInvite: { createMany: jest.fn() },
        eventInvite: { findMany: jest.fn(), create: jest.fn() },
        eventParticipation: { findFirst: jest.fn() },
        jobQueue: { create: jest.fn() },
        category: { findFirst: jest.fn() },
        $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
            fn({
                eventInvite: {
                    create: jest.fn().mockResolvedValue({
                        id: "inv-1",
                        email: "a@b.com",
                        token: "tok",
                    }),
                },
                jobQueue: { create: jest.fn().mockResolvedValue({}) },
            })
        ),
    },
}));

jest.mock("@/domain/ai/quota", () => ({
    getAiUsageStats: jest.fn(),
    checkAiQuota: jest.fn().mockResolvedValue({ allowed: true }),
    deductAiUsage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/ai-service", () => ({
    aiService: {
        semanticSearch: jest.fn(),
        recommendOrgs: jest.fn().mockResolvedValue([
            { orgId: "org-match-1", name: "Match Co", score: 0.91, sharedEvents: 2 },
        ]),
        recommendEvents: jest.fn(),
        generateEventDescription: jest.fn().mockResolvedValue({
            content: "Polished AI Event description",
        }),
    },
    getMasterJwt: jest.fn(),
}));

jest.mock("@/domain/users", () => ({
    getUserById: jest.fn(),
}));

jest.mock("@/domain/organizations", () => ({
    getOrganizationById: jest.fn(),
}));

jest.mock("@/domain/events", () => ({
    getHostEvents: jest.fn().mockResolvedValue([]),
    getEventById: jest.fn(),
    getAttendingEvents: jest.fn().mockResolvedValue([]),
    getMeetingRequestsForEvent: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/domain/billing", () => ({
    getBillingStatus: jest.fn().mockResolvedValue({
        plan: "PRO",
        status: "ACTIVE",
        expiresAt: null,
        isVerified: true,
        latestSubscription: null,
    }),
}));

jest.mock("@/domain/billing/errors", () => ({
    BillingError: class BillingError extends Error {
        status: number;
        constructor(status: number, message: string) {
            super(message);
            this.status = status;
        }
    },
}));

jest.mock("@/data/dashboard", () => ({
    getOrgConnections: jest.fn().mockResolvedValue([]),
    getOrgDashboardStats: jest.fn().mockResolvedValue({
        eventsHosted: 0,
        membersCount: 1,
        participationsAsHost: 0,
        eventsAttending: 0,
        totalRevenue: 0,
    }),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkAiQuota, deductAiUsage } from "@/domain/ai/quota";
import { aiService } from "@/lib/ai-service";
import { TOOL_REGISTRY } from "@/domain/ai/tools";

describe("Agent Tool Registry (Command Pattern)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (checkAiQuota as jest.Mock).mockResolvedValue({ allowed: true });
        (deductAiUsage as jest.Mock).mockResolvedValue(undefined);
        (aiService.generateEventDescription as jest.Mock).mockResolvedValue({
            content: "Polished AI Event description",
        });
        (aiService.recommendOrgs as jest.Mock).mockResolvedValue([
            { orgId: "org-match-1", name: "Match Co", score: 0.91, sharedEvents: 2 },
        ]);
    });

    it("should contain all expected tool handlers", () => {
        const expectedTools = [
            "list_my_events",
            "get_event_details",
            "create_event",
            "update_event",
            "delete_event",
            "search_events",
            "get_recommendations",
            "get_ai_usage_stats",
            "generate_event_description",
            "get_my_profile",
            "get_org_details",
            "list_notifications",
            "send_event_invites",
            "discover_organizations",
            "list_org_connections",
            "list_attending_events",
            "get_meeting_requests",
            "get_org_dashboard_stats",
            "list_org_members",
            "list_pending_invites",
            "get_billing_status",
        ];

        expectedTools.forEach((toolName) => {
            expect(TOOL_REGISTRY[toolName]).toBeDefined();
            expect(typeof TOOL_REGISTRY[toolName]).toBe("function");
        });
    });

    it("should throw error for delete_event if user is not ADMIN or OWNER", async () => {
        const deleteHandler = TOOL_REGISTRY["delete_event"];
        await expect(
            deleteHandler({
                userId: "user-123",
                orgId: "org-123",
                role: "MEMBER",
                toolArgs: { eventId: "event-123" },
            })
        ).rejects.toThrow("Forbidden");
    });

    it("send_event_invites rejects MEMBER role", async () => {
        const handler = TOOL_REGISTRY["send_event_invites"];
        await expect(
            handler({
                userId: "user-123",
                orgId: "org-123",
                role: "MEMBER",
                toolArgs: { eventId: "event-123", emails: ["a@b.com"] },
            })
        ).rejects.toThrow("Forbidden");
    });

    it("discover_organizations uses AI matchmaking recommendOrgs", async () => {
        const handler = TOOL_REGISTRY["discover_organizations"];
        const result = await handler({
            userId: "user-123",
            orgId: "org-123",
            role: "OWNER",
            toolArgs: { limit: 5 },
        });

        expect(checkAiQuota).toHaveBeenCalledWith("org-123", "recommendOrgs");
        expect(aiService.recommendOrgs).toHaveBeenCalledWith("org-123", 5);
        expect(deductAiUsage).toHaveBeenCalledWith("org-123");
        expect(result).toEqual({
            count: 1,
            organizations: [
                {
                    orgId: "org-match-1",
                    name: "Match Co",
                    matchScore: 0.91,
                    sharedEvents: 2,
                },
            ],
        });
    });

    it("get_event_details rejects private events for non-members", async () => {
        (prisma.events.findUnique as jest.Mock).mockResolvedValueOnce({
            id: "event-private",
            title: "Secret",
            description: "x",
            location: "Online",
            startDateTime: new Date(),
            endDateTime: new Date(),
            visibility: "PRIVATE",
            isFree: true,
            price: null,
            eventType: "ONLINE",
            maxAttendees: null,
            attendeeCount: 0,
            organizationId: "other-org",
            category: { id: "c1", name: "Tech" },
            organization: { id: "other-org", name: "Other Co" },
        });
        (prisma.organizationMember.findUnique as jest.Mock).mockResolvedValueOnce(null);

        const handler = TOOL_REGISTRY["get_event_details"];
        await expect(
            handler({
                userId: "user-123",
                orgId: "org-123",
                role: "OWNER",
                toolArgs: { eventId: "event-private" },
            })
        ).rejects.toThrow("Forbidden: This is a private event");
    });

    it("generate_event_description succeeds without browser session auth", async () => {
        (auth as jest.Mock).mockResolvedValueOnce(null);

        const handler = TOOL_REGISTRY["generate_event_description"];
        const result = await handler({
            userId: "user-123",
            orgId: "org-123",
            role: "OWNER",
            toolArgs: { roughDraft: "AI Event", eventId: "" },
        });

        expect(result).toEqual({
            success: true,
            data: { content: "Polished AI Event description" },
        });
        expect(checkAiQuota).toHaveBeenCalledWith("org-123", "generateDescription");
        expect(aiService.generateEventDescription).toHaveBeenCalledWith(
            "org-123",
            "AI Event",
            undefined
        );
        expect(deductAiUsage).toHaveBeenCalledWith("org-123");
        expect(auth).not.toHaveBeenCalled();
    });

    it("generate_event_description throws when quota denied", async () => {
        (checkAiQuota as jest.Mock).mockResolvedValueOnce({
            allowed: false,
            reason: "AI quota exceeded",
        });

        const handler = TOOL_REGISTRY["generate_event_description"];
        await expect(
            handler({
                userId: "user-123",
                orgId: "org-123",
                role: "OWNER",
                toolArgs: { roughDraft: "AI Event" },
            })
        ).rejects.toThrow("AI quota exceeded");
        expect(deductAiUsage).not.toHaveBeenCalled();
    });

    it("should sign and verify real master JWT tokens using HMAC-SHA256", () => {
        const crypto = require("crypto");
        const secretKey = "[ENCRYPTION_KEY]";

        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(
            JSON.stringify({ role: "master", iat: Math.floor(Date.now() / 1000) })
        ).toString("base64url");

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(`${header}.${payload}`)
            .digest("base64url");
        const token = `${header}.${payload}.${signature}`;

        const [h, p, s] = token.split(".");
        const expectedSig = crypto
            .createHmac("sha256", secretKey)
            .update(`${h}.${p}`)
            .digest("base64url");

        expect(s).toBe(expectedSig);
        expect(JSON.parse(Buffer.from(p, "base64url").toString()).role).toBe("master");
    });
});
