import { SignJWT } from "jose";
import { auth } from "@/auth";

const LV_SERVICE_URL = process.env.LV_SERVICE_URL;

if (!LV_SERVICE_URL) {
    console.warn("[lv-service client] LV_SERVICE_URL is not set — virtual room features will be unavailable.");
}

/**
 * Mints a short-lived internal JWT for authenticating Next.js → lv-service calls.
 * Uses the same AUTH_SECRET and pattern as the ws-service token.
 * Contains: userId, activeOrgId, role (for host permission checks in lv-service).
 */
async function mintLvToken(
    userId: string,
    activeOrgId: string,
    role: string
): Promise<string> {
    if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    return new SignJWT({ userId, activeOrgId, role })
        .setProtectedHeader({ alg: process.env.HASHING_ALGO || "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secret);
}

type LvFetchOptions = Omit<RequestInit, "headers"> & {
    userId: string;
    activeOrgId: string;
    role?: string;
};

/**
 * Authenticated fetch wrapper for internal Next.js → lv-service calls.
 * Automatically mints and attaches the internal JWT.
 */
export async function lvFetch(
    path: string,
    { userId, activeOrgId, role = "MEMBER", ...fetchOpts }: LvFetchOptions
): Promise<Response> {
    if (!LV_SERVICE_URL) {
        throw new Error("LV_SERVICE_URL is not configured");
    }
    const token = await mintLvToken(userId, activeOrgId, role);
    return fetch(`${LV_SERVICE_URL}${path}`, {
        ...fetchOpts,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
}

/**
 * Convenience: get the current session's auth context for lv-service calls.
 * Returns null if the user is not authenticated or has no active org.
 */
export async function getLvAuthContext(): Promise<{
    userId: string;
    activeOrgId: string;
    role: string;
} | null> {
    const session = await auth();
    if (!session?.user?.id || !session.user.activeOrganizationId) return null;
    return {
        userId: session.user.id,
        activeOrgId: session.user.activeOrganizationId,
        role: session.user.role ?? "MEMBER",
    };
}
