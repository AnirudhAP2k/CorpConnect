import { jwtVerify, importJWK } from "jose";

export interface SocketAuthPayload {
    userId: string;
    activeOrgId: string;
}

/**
 * Verifies the short-lived WS token issued by the Next.js API route
 * POST /api/messaging/ws-token. The token contains { userId, activeOrgId }
 * and is signed with the same AUTH_SECRET used by NextAuth.
 */
export async function verifySocketAuth(token: string): Promise<SocketAuthPayload> {
    if (!process.env.AUTH_SECRET) {
        throw new Error("AUTH_SECRET environment variable is required");
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const decoded = await jwtVerify(token, secret, {
        algorithms: [process.env.HASHING_ALGO || "HS256"],
    });

    const userId = decoded.payload["userId"] as string | undefined;
    const activeOrgId = decoded.payload["activeOrgId"] as string | undefined;

    if (!userId || !activeOrgId) {
        throw new Error("Token missing required fields: userId, activeOrgId");
    }

    return { userId, activeOrgId };
}
