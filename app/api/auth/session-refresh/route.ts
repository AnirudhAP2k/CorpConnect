import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken, storeRefreshToken } from "@/lib/tokens";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME, JWT_MAX_AGE_SECONDS } from "@/constants";

/**
 * GET /api/auth/session-refresh?returnTo=/some/page
 *
 * The single source of truth for session recovery.
 *
 * Called by middleware whenever it detects an expired JWT cookie
 * but the user still has a valid httpOnly refresh_token cookie.
 *
 * Both paths converge here:
 *   - Idle user navigates   → middleware redirects here
 *   - Active user (future)  → can also redirect here if update() somehow fails
 *
 * Flow:
 *   1. Read refresh_token from httpOnly cookie
 *   2. Rotate it in the DB (revoke old, issue new) — token reuse detection included
 *   3. Fetch fresh user fields (role/org may have changed during idle)
 *   4. Encode a new NextAuth-compatible JWT
 *   5. Set it as the session cookie on the redirect response
 *   6. Redirect user transparently to their original destination
 *
 * On any failure → redirect to /login.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const returnTo = searchParams.get("returnTo") || "/dashboard";

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const rotated = await rotateRefreshToken(
            refreshToken,
            req.headers.get("user-agent") || undefined,
            req.headers.get("x-forwarded-for") || undefined,
        );

        await storeRefreshToken(rotated.token);

        const freshUser = await prisma.user.findUnique({
            where: { id: rotated.user.id },
            select: {
                id: true,
                role: true,
                isAppAdmin: true,
                hasCompletedOnboarding: true,
                activeOrganizationId: true,
            },
        });

        if (!freshUser) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        const secret = process.env.AUTH_SECRET!;
        const nowSec = Math.floor(Date.now() / 1000);

        const newJwt = await encode({
            token: {
                sub: freshUser.id,
                role: freshUser.role,
                isAppAdmin: freshUser.isAppAdmin,
                hasCompletedOnboarding: freshUser.hasCompletedOnboarding,
                activeOrganizationId: freshUser.activeOrganizationId,
                iat: nowSec,
                exp: nowSec + JWT_MAX_AGE_SECONDS,
            },
            secret,
            salt: SESSION_COOKIE_NAME,
        });

        const response = NextResponse.redirect(new URL(returnTo, req.url));

        response.cookies.set(SESSION_COOKIE_NAME, newJwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: JWT_MAX_AGE_SECONDS,
        });

        return response;
    } catch (err) {
        console.error("[session-refresh] Failed to rotate token:", err);
        return NextResponse.redirect(new URL("/login", req.url));
    }
}
