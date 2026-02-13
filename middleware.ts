import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { redirect } from "next/navigation"
import {
  defaultRoute,
  authRoutes,
  publicRoutes,
  protectedRoutes,
  apiAuthRoutes,
  onboardingRoutes
} from "@/lib/routes";
import { getUserById } from "@/data/user";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthRoutes);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isOnboardingRoute = onboardingRoutes.includes(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);

  if (isApiAuthRoute) {
    return;
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(defaultRoute, nextUrl));
    }
    return;
  }

  if (!isPublicRoute && !isLoggedIn) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  // Check if logged-in user has completed onboarding
  if (isLoggedIn && !isOnboardingRoute && req.auth?.user?.id) {
    const user = await getUserById(req.auth.user.id);

    if (user && !user.hasCompletedOnboarding) {
      return Response.redirect(new URL('/onboarding', nextUrl));
    }
  }

  // Redirect to dashboard if user tries to access onboarding after completing it
  if (isOnboardingRoute && isLoggedIn && req.auth?.user?.id) {
    const user = await getUserById(req.auth.user.id);

    if (user && user.hasCompletedOnboarding) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}