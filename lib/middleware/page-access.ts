import { defaultRoute } from "@/lib/routes";
import type { RouteKind } from "@/lib/middleware/route-policy";

const SESSION_REFRESH_PATH = "/api/auth/session-refresh";

export interface MiddlewareUser {
    hasCompletedOnboarding?: boolean;
    isAppAdmin?: boolean;
}

export interface PageAccessContext {
    kind: RouteKind;
    isLoggedIn: boolean;
    user?: MiddlewareUser;
    pathname: string;
    search: string;
    hasRefreshToken: boolean;
}

export type PageAccessDecision =
    | { type: "allow" }
    | { type: "redirect"; destination: string };

/**
 * Pure page-access policy. Keeping URL classification and access decisions free
 * of Next.js request objects makes the security rules straightforward to test.
 */
export function decidePageAccess({
    kind,
    isLoggedIn,
    user,
    pathname,
    search,
    hasRefreshToken,
}: PageAccessContext): PageAccessDecision {
    if (kind === "auth") {
        return isLoggedIn
            ? { type: "redirect", destination: defaultRoute }
            : { type: "allow" };
    }

    if (kind === "public") return { type: "allow" };

    if (!isLoggedIn) {
        if (hasRefreshToken) {
            const returnTo = encodeURIComponent(pathname + search);
            return {
                type: "redirect",
                destination: `${SESSION_REFRESH_PATH}?returnTo=${returnTo}`,
            };
        }

        return { type: "redirect", destination: "/login" };
    }

    if (kind === "admin" && !user?.isAppAdmin) {
        return { type: "redirect", destination: "/dashboard" };
    }

    if (kind === "onboarding" && user?.hasCompletedOnboarding) {
        return { type: "redirect", destination: "/dashboard" };
    }

    if (kind === "organization" && !user?.hasCompletedOnboarding) {
        return { type: "redirect", destination: "/onboarding" };
    }

    return { type: "allow" };
}
