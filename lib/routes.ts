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
    '/u/',
];

export const organizationRoutePrefix = '/organizations';

export const apiRoutePrefix = "/api";

export const apiAuthRoutePrefix = "/api/auth";

export const publicApiRoutes = [
    "/api/health",
    "/api/jobs/trigger",
    "/api/webhooks/livekit",
    "/api/webhooks/n8n-callback",
    "/api/webhooks/org-verification",
    "/api/webhooks/razorpay",
    "/api/webhooks/stripe",
];

export const onboardingRoutes = [
    '/onboarding'
];

export const adminRoutePrefix = '/admin';
