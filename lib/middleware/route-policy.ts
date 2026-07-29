import {
    adminRoutePrefix,
    apiAuthRoutePrefix,
    apiRoutePrefix,
    authRoutes,
    onboardingRoutes,
    organizationRoutePrefix,
    publicApiPrefixes,
    publicApiRoutes,
    publicRoutePrefixes,
    publicRoutes,
} from "@/lib/routes";

export type RouteKind =
    | "api-auth"
    | "api-public"
    | "api-protected"
    | "auth"
    | "public"
    | "admin"
    | "onboarding"
    | "organization"
    | "protected";

/**
 * Matches a path segment, not merely a string prefix.
 *
 * `/api/auth` therefore matches `/api/auth/login` but not `/api/authentic`,
 * and `/admin` covers dynamic admin pages without maintaining an exhaustive list.
 */
export function matchesSegment(pathname: string, route: string): boolean {
    const normalized = route.endsWith("/") && route !== "/"
        ? route.slice(0, -1)
        : route;

    return pathname === normalized || pathname.startsWith(`${normalized}/`);
}

export function classifyRoute(pathname: string): RouteKind {
    if (matchesSegment(pathname, apiAuthRoutePrefix)) return "api-auth";

    if (matchesSegment(pathname, apiRoutePrefix)) {
        const isPublicApi =
            publicApiRoutes.includes(pathname) ||
            publicApiPrefixes.some((prefix) => matchesSegment(pathname, prefix));

        return isPublicApi ? "api-public" : "api-protected";
    }

    if (authRoutes.includes(pathname)) return "auth";

    const isPublicPage =
        publicRoutes.includes(pathname) ||
        publicRoutePrefixes.some((prefix) => matchesSegment(pathname, prefix));

    if (isPublicPage) return "public";
    if (matchesSegment(pathname, adminRoutePrefix)) return "admin";
    if (onboardingRoutes.includes(pathname)) return "onboarding";
    if (matchesSegment(pathname, organizationRoutePrefix)) return "organization";

    // The application is private by default. New pages cannot accidentally become
    // public simply because somebody forgot to add them to a protected-route list.
    return "protected";
}

export function isApiRouteKind(kind: RouteKind): boolean {
    return kind.startsWith("api-");
}
