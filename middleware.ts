import NextAuth from "next-auth"
import { NextResponse } from "next/server";
import authConfig from "@/auth.config"
import { verifyMobileAccessToken } from "@/lib/mobile-auth";
import {
	defaultRoute,
	authRoutes,
	publicRoutes,
	publicRoutePrefixes,
	protectedRoutes,
	apiAuthRoutes,
	apiRoutes,
	publicApiPrefixes,
	onboardingRoutes,
	adminRoutes,
	organizationRoutes
} from "@/lib/routes";
import { setApiAuth } from "@/lib/api-auth";
import { AUTH_SESSION_HEADER } from "@/constants";

const { auth } = NextAuth(authConfig);

const SESSION_REFRESH_PATH = "/api/auth/session-refresh";


export default auth(async (req) => {
	const { nextUrl } = req;
	const isLoggedIn = !!req.auth;

	const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthRoutes);
	const isApiRoute = nextUrl.pathname.startsWith(apiRoutes);

	if (isApiAuthRoute) {
		return;
	}

	if (isApiRoute) {

		const isPublicApiRoute = publicApiPrefixes.some((prefix) =>
			nextUrl.pathname.startsWith(prefix)
		);

		if (isPublicApiRoute) return;

		const requestHeaders = new Headers(req.headers);
		requestHeaders.delete(AUTH_SESSION_HEADER);

		// ── Hybrid Mobile Auth ─────────────────────────────────────────────────
		const mobilePayload = await verifyMobileAccessToken(req);
		if (mobilePayload) {
			setApiAuth(requestHeaders, mobilePayload);

			return NextResponse.next({ request: { headers: requestHeaders } });
		}

		if (!isLoggedIn) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (req.auth?.user?.id) {
			const user = req.auth.user;
			setApiAuth(requestHeaders, user);
		}

		return NextResponse.next({ request: { headers: requestHeaders } });
	}

	const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
		|| publicRoutePrefixes.some((prefix) => nextUrl.pathname.startsWith(prefix));
	const isAuthRoute = authRoutes.includes(nextUrl.pathname);
	const isOnboardingRoute = onboardingRoutes.includes(nextUrl.pathname);
	const isAdminRoute = adminRoutes.includes(nextUrl.pathname);
	const isOrganizationRoute = organizationRoutes.includes(nextUrl.pathname);

	if (isAuthRoute) {
		if (isLoggedIn) {
			return Response.redirect(new URL(defaultRoute, nextUrl));
		}
		return;
	}

	if (!isPublicRoute && !isLoggedIn) {
		const refreshToken = req.cookies.get("refreshToken")?.value;

		if (refreshToken) {
			const returnTo = encodeURIComponent(nextUrl.pathname + nextUrl.search);

			return Response.redirect(
				new URL(`${SESSION_REFRESH_PATH}?returnTo=${returnTo}`, nextUrl)
			);
		}

		return Response.redirect(new URL("/login", nextUrl));
	}

	if (isAdminRoute && isLoggedIn && req.auth?.user) {
		const isAppAdmin = req.auth.user.isAppAdmin;
		if (!isAppAdmin) {
			return Response.redirect(new URL("/dashboard", nextUrl));
		}
	}

	if (isOnboardingRoute && isLoggedIn && req.auth?.user) {
		const user = req.auth.user;

		if (user && user.hasCompletedOnboarding) {
			return Response.redirect(new URL("/dashboard", nextUrl));
		}
	}

	if (isOrganizationRoute && isLoggedIn && req.auth?.user) {
		const user = req.auth.user;

		if (user && !user.hasCompletedOnboarding) {
			return Response.redirect(new URL("/onboarding", nextUrl));
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