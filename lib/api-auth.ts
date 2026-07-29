import "server-only";

import { NextRequest } from "next/server";
import { AUTH_SESSION_HEADER } from "@/constants";
import { ApiAuthUser } from "@/lib/types";

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

