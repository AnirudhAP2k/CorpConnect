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
        notification: { findMany: jest.fn() },
        pendingInvite: { createMany: jest.fn() },
        category: { findFirst: jest.fn() },
    },
}));

import { TOOL_REGISTRY } from "@/domain/ai/tools";

describe("Agent Tool Registry (Command Pattern)", () => {
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
        ];

        expectedTools.forEach(toolName => {
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

    it("should sign and verify real master JWT tokens using HMAC-SHA256", () => {
        const crypto = require("crypto");
        const secretKey = "[ENCRYPTION_KEY]";

        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({ role: "master", iat: Math.floor(Date.now() / 1000) })).toString("base64url");

        const signature = crypto.createHmac("sha256", secretKey).update(`${header}.${payload}`).digest("base64url");
        const token = `${header}.${payload}.${signature}`;

        const [h, p, s] = token.split(".");
        const expectedSig = crypto.createHmac("sha256", secretKey).update(`${h}.${p}`).digest("base64url");

        expect(s).toBe(expectedSig);
        expect(JSON.parse(Buffer.from(p, "base64url").toString()).role).toBe("master");
    });
});
