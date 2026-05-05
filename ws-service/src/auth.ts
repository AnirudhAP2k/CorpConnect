import jwt from "jsonwebtoken";

export interface SocketAuthPayload {
    userId: string;
    activeOrgId: string;
}

/**
 * Verifies the short-lived WS token issued by the Next.js API route
 * POST /api/messaging/ws-token. The token contains { userId, activeOrgId }
 * and is signed with the same AUTH_SECRET used by NextAuth.
 */
export function verifySocketAuth(token: string): SocketAuthPayload {
    if (!process.env.AUTH_SECRET) {
        throw new Error("AUTH_SECRET environment variable is required");
    }

    const decoded = jwt.verify(token, process.env.AUTH_SECRET) as Record<string, unknown>;

    const userId = decoded["userId"] as string | undefined;
    const activeOrgId = decoded["activeOrgId"] as string | undefined;

    if (!userId || !activeOrgId) {
        throw new Error("Token missing required fields: userId, activeOrgId");
    }

    return { userId, activeOrgId };
}
