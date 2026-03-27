import { NextResponse } from "next/server";
import { rotateRefreshToken } from "@/lib/tokens";
import { SignJWT } from "jose";

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

        // Access the updated user loaded by the enriched rotateRefreshToken
        const user = rotatedTokenMetadata.user;

        // Generate Stateless Access Token (JWT)
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const accessToken = await new SignJWT({
            sub: user.id,
            role: user.role,
            isAppAdmin: user.isAppAdmin,
            hasCompletedOnboarding: user.hasCompletedOnboarding,
            activeOrganizationId: user.activeOrganizationId,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("15m")
            .sign(secret);

        return NextResponse.json({
            accessToken,
            refreshToken: rotatedTokenMetadata.token,
            expiresAt: rotatedTokenMetadata.expiresAt,
        });

    } catch (error) {
        console.error("Mobile refresh error:", error);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
