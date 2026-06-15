import "server-only";

import { NextRequest } from "next/server";
import { OrganizationRole, ApiTier } from "@prisma/client";
import { ExtendedUser } from "@/next-auth";
import { AUTH_SESSION_HEADER } from "@/constants";
import { ApiAuthUser } from "@/lib/types";

/**
 * Accepted input shape for setApiAuth().
 * Flexible enough to accept both JWTPayload (has `sub`) and ExtendedUser (has `id`).
 */
interface AuthPayloadInput extends ExtendedUser {
    sub?: string;
}

/**
 * Reads the full authenticated user context injected by middleware.
 * Returns the same shape as `session.user` from NextAuth — no DB query needed.
 *
 * IMPORTANT: Only use in API route handlers (/api/*).
 * For Server Components and pages, continue using `auth()`.
 */
export function getApiAuth(req: NextRequest): ApiAuthUser | null {
    const raw = req.headers.get(AUTH_SESSION_HEADER);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as ApiAuthUser;
        if (!parsed.id) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Serializes the authenticated user context onto a mutable Headers object.
 * Called by middleware to inject auth context before forwarding the request.
 *
 * @param headers - A mutable `Headers` instance
 * @param user    - The user payload from either a JWT or NextAuth session
 */
export function setApiAuth(headers: Headers, user: AuthPayloadInput) {
    const id = user.id || user.sub || undefined;
    if (!id) return;

    headers.set(AUTH_SESSION_HEADER, JSON.stringify({
        id,
        email: user.email ?? null,
        role: user.role as OrganizationRole | null ?? null,
        isAppAdmin: user.isAppAdmin as boolean ?? false,
        hasCompletedOnboarding: user.hasCompletedOnboarding as boolean ?? false,
        activeOrganizationId: user.activeOrganizationId as string | null ?? null,
        apiTier: user.apiTier as ApiTier ?? "FREE",
    } satisfies ApiAuthUser));
}
