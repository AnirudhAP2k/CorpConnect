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
];

export const protectedRoutes = [
    '/events/create',
    '/profile',
    '/organizations/:id',
    '/organizations/:id/members',
    '/organizations/:id/events',
    '/organizations/:id/events/:eventId',
    '/organizations/:id/members/:memberId',
    '/organizations/:id/events/:eventId/invites',
];

export const apiAuthRoutes = "/api/auth";

export const onboardingRoutes = [
    '/onboarding'
];

