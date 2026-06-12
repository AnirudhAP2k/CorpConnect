import { NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/tokens";
import { SignJWT } from "jose";
import { getFreshSessionUser } from "@/domain/users";

/**
 * Mobile Token Refresh Endpoint
 * 
 * Specifically for mobile clients. Receives an old Refresh Token in the body
 * (not cookie) and returns a rotated Refresh + Access Token pair.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { refreshToken } = body;

        if (!refreshToken) {
            return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
        }

        // Validate and rotate in the database
        const rotatedTokenMetadata = await rotateRefreshToken(
            refreshToken,
            req.headers.get("user-agent") || undefined,
            req.headers.get("x-forwarded-for") || undefined
        );

        const { user: baseUser } = rotatedTokenMetadata;
        const freshUser = await getFreshSessionUser(baseUser.id, baseUser.activeOrganizationId);

        if (!freshUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = freshUser.role;

        // Generate Stateless Access Token (JWT)
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const accessToken = await new SignJWT({
            sub: freshUser.id,
            role,
            isAppAdmin: freshUser.isAppAdmin,
            hasCompletedOnboarding: freshUser.hasCompletedOnboarding,
            activeOrganizationId: freshUser.activeOrganizationId,
        })
            .setProtectedHeader({ alg: process.env.HASHING_ALGO || "HS256" })
            .setExpirationTime("15m")
            .sign(secret);

        return NextResponse.json({
            accessToken,
            refreshToken: rotatedTokenMetadata.token,
            expiresAt: rotatedTokenMetadata.expiresAt,
        });

    } catch (error: any) {
        console.error("Mobile refresh error:", error);
        return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 401 });
    }
}
