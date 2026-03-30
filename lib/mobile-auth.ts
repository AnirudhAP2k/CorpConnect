import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

/**
 * Decodes a Bearer access token from the Authorization header.
 * Returns the payload if valid, null otherwise.
 *
 * Used by the Hybrid API middleware to allow mobile clients
 * (which cannot use cookies) to authenticate against the same
 * API routes as the web app.
 */
export async function verifyMobileAccessToken(req: NextRequest) {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice(7); // strip "Bearer"

    try {
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ["HS256"],
        });

        return payload;
    } catch {
        return null;
    }
}

/**
 * Middleware helper: returns a 401 response if neither a valid cookie
 * session nor a valid Bearer token is present.
 *
 * Usage in an API route handler:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.sub is the userId
 */
export async function requireMobileAuth(req: NextRequest) {
    const payload = await verifyMobileAccessToken(req);
    if (!payload || !payload.sub) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }
    return payload;
}
