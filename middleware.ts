import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { handleApiRequest } from "@/lib/middleware/api-request";
import { decidePageAccess } from "@/lib/middleware/page-access";
import {
	classifyRoute,
	isApiRouteKind,
} from "@/lib/middleware/route-policy";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
	const { nextUrl } = req;
	const kind = classifyRoute(nextUrl.pathname);

	if (isApiRouteKind(kind)) {
		return handleApiRequest(req, kind, req.auth?.user);
	}

	const decision = decidePageAccess({
		kind,
		isLoggedIn: Boolean(req.auth),
		user: req.auth?.user,
		pathname: nextUrl.pathname,
		search: nextUrl.search,
		hasRefreshToken: Boolean(req.cookies.get("refreshToken")?.value),
	});

	return decision.type === "redirect"
		? NextResponse.redirect(new URL(decision.destination, nextUrl))
		: NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
}