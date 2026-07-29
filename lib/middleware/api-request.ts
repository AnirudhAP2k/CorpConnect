import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_HEADER } from "@/constants";
import { setApiAuth } from "@/lib/middleware/api-auth-context";
import { verifyMobileAccessToken } from "@/lib/mobile-auth";
import type { RouteKind } from "@/lib/middleware/route-policy";

/**
 * Handles API authentication for browser sessions and mobile Bearer tokens.
 *
 * Every API request gets a fresh header set with the internal auth header removed
 * first. This is important even for public endpoints: callers must never be able
 * to forge the trusted middleware-to-route identity header.
 */
export async function handleApiRequest(
    req: NextRequest,
    kind: RouteKind,
    sessionUser?: Session["user"],
): Promise<NextResponse> {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete(AUTH_SESSION_HEADER);

    if (kind === "api-auth" || kind === "api-public") {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const mobilePayload = await verifyMobileAccessToken(req);
    if (mobilePayload) {
        setApiAuth(requestHeaders, mobilePayload);
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    setApiAuth(requestHeaders, sessionUser);
    return NextResponse.next({ request: { headers: requestHeaders } });
}
