export const defaultRoute = '/';

export const authRoutes = [
    '/register',
    '/login',
    '/reset',
    '/verify-token',
    '/new-password',
];

export const publicRoutes = [
    '/',
    '/about',
    '/contact',
    '/events',
    '/organizations/discover',
    '/pricing',
    '/privacy',
    '/terms',
];

/**
 * Dynamic public route prefixes that allow unauthenticated access.
 * The pages themselves handle auth redirection with proper callbackUrl.
 */
export const publicRoutePrefixes = [
    '/events/invite/',
    '/invite/',
];

export const organizationRoutePrefix = '/organizations';

export const apiRoutePrefix = "/api";

export const apiAuthRoutePrefix = "/api/auth";

export const publicApiRoutes = [
    "/api/health",
    "/api/jobs/trigger",
];

export const publicApiPrefixes = [
    "/api/webhooks/",
];

export const onboardingRoutes = [
    '/onboarding'
];

export const adminRoutePrefix = '/admin';
