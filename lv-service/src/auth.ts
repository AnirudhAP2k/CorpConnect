import { jwtVerify } from "jose";

export interface InternalAuthPayload {
    userId: string;
    activeOrgId: string;
    role: string; // OrganizationRole: OWNER | ADMIN | MEMBER
}

/**
 * Verifies the short-lived internal JWT issued by Next.js before calling lv-service.
 * Signed with the same AUTH_SECRET used by NextAuth and ws-service.
 */
export async function verifyInternalToken(token: string): Promise<InternalAuthPayload> {
    if (!process.env.AUTH_SECRET) {
        throw new Error("AUTH_SECRET environment variable is required");
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
        algorithms: [process.env.HASHING_ALGO || "HS256"],
    });

    const userId = payload["userId"] as string | undefined;
    const activeOrgId = payload["activeOrgId"] as string | undefined;
    const role = (payload["role"] as string | undefined) ?? "MEMBER";

    if (!userId || !activeOrgId) {
        throw new Error("Token missing required fields: userId, activeOrgId");
    }

    return { userId, activeOrgId, role };
}
