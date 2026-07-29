import { decidePageAccess } from "@/lib/middleware/page-access";
import {
    classifyRoute,
    matchesSegment,
} from "@/lib/middleware/route-policy";

describe("middleware route policy", () => {
    it("matches complete path segments rather than lookalike prefixes", () => {
        expect(matchesSegment("/api/auth/login", "/api/auth")).toBe(true);
        expect(matchesSegment("/api/authentic", "/api/auth")).toBe(false);
    });

    it.each([
        ["/", "public"],
        ["/contact", "public"],
        ["/privacy", "public"],
        ["/terms", "public"],
        ["/invite/abc", "public"],
        ["/api/health", "api-public"],
        ["/api/jobs/trigger", "api-public"],
        ["/api/webhooks/stripe", "api-public"],
        ["/api/auth/login", "api-auth"],
        ["/api/authentic", "api-protected"],
        ["/api/events", "api-protected"],
        ["/admin/organizations/abc", "admin"],
        ["/onboarding", "onboarding"],
        ["/organizations/create", "organization"],
        ["/organizations/abc/members", "organization"],
        ["/dashboard", "protected"],
    ] as const)("classifies %s as %s", (pathname, expected) => {
        expect(classifyRoute(pathname)).toBe(expected);
    });
});

describe("middleware page access policy", () => {
    const base = {
        pathname: "/dashboard",
        search: "",
        hasRefreshToken: false,
    };

    it("allows public pages without a session", () => {
        expect(decidePageAccess({
            ...base,
            kind: "public",
            isLoggedIn: false,
        })).toEqual({ type: "allow" });
    });

    it("redirects an unauthenticated protected request to login", () => {
        expect(decidePageAccess({
            ...base,
            kind: "protected",
            isLoggedIn: false,
        })).toEqual({ type: "redirect", destination: "/login" });
    });

    it("uses session refresh and preserves the full return path", () => {
        expect(decidePageAccess({
            kind: "protected",
            isLoggedIn: false,
            pathname: "/dashboard",
            search: "?tab=events",
            hasRefreshToken: true,
        })).toEqual({
            type: "redirect",
            destination:
                "/api/auth/session-refresh?returnTo=%2Fdashboard%3Ftab%3Devents",
        });
    });

    it("blocks non-admin users from every nested admin page", () => {
        expect(decidePageAccess({
            ...base,
            kind: "admin",
            isLoggedIn: true,
            user: { isAppAdmin: false },
        })).toEqual({ type: "redirect", destination: "/dashboard" });
    });

    it("allows an app admin through nested admin pages", () => {
        expect(decidePageAccess({
            ...base,
            kind: "admin",
            isLoggedIn: true,
            user: { isAppAdmin: true },
        })).toEqual({ type: "allow" });
    });

    it("keeps incomplete users out of organization routes", () => {
        expect(decidePageAccess({
            ...base,
            kind: "organization",
            isLoggedIn: true,
            user: { hasCompletedOnboarding: false },
        })).toEqual({ type: "redirect", destination: "/onboarding" });
    });

    it("keeps completed users out of onboarding", () => {
        expect(decidePageAccess({
            ...base,
            kind: "onboarding",
            isLoggedIn: true,
            user: { hasCompletedOnboarding: true },
        })).toEqual({ type: "redirect", destination: "/dashboard" });
    });
});
