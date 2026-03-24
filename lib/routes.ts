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

export const organizationRoutes = [
    '/organizations/:id',
    '/organizations/:id/members',
    '/organizations/:id/events',
    '/organizations/:id/events/:eventId',
    '/organizations/:id/members/:memberId',
    '/organizations/:id/events/:eventId/invites',
];

export const protectedRoutes = [
    '/dashboard',
    '/events/create',
    '/profile',
    ...organizationRoutes
];

export const apiAuthRoutes = "/api/auth";

export const onboardingRoutes = [
    '/onboarding'
];

export const adminRoutes = [
    '/admin/dashboard',
    '/admin/organizations',
    '/admin/users',
    '/admin/events',
    '/admin/jobs',
];
