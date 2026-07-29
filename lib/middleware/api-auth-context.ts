import type { ApiTier, OrganizationRole } from "@prisma/client";
import { AUTH_SESSION_HEADER } from "@/constants";

/**
 * Minimal shape shared by NextAuth session users and mobile JWT payloads.
 * This module is Edge-safe; the server-only header reader stays in lib/api-auth.ts.
 */
export interface ApiAuthPayload {
    id?: string;
    sub?: string;
    email?: string | null;
    role?: OrganizationRole | null;
    isAppAdmin?: boolean;
    hasCompletedOnboarding?: boolean;
    activeOrganizationId?: string | null;
    apiTier?: ApiTier;
}

export function setApiAuth(headers: Headers, user: ApiAuthPayload): void {
    const id = user.id || user.sub;
    if (!id) return;

    headers.set(AUTH_SESSION_HEADER, JSON.stringify({
        id,
        email: user.email ?? null,
        role: user.role ?? null,
        isAppAdmin: user.isAppAdmin ?? false,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
        activeOrganizationId: user.activeOrganizationId ?? null,
        apiTier: user.apiTier ?? "FREE",
    }));
}
