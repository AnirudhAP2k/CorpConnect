import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/tokens";

/**
 * Mobile Logout Endpoint
 * 
 * Specifically for mobile clients. Receives the Refresh Token in the body
 * and revokes it in the database to invalidate future refreshes.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { refreshToken } = body;

        if (!refreshToken) {
            return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
        }

        // Revoke token in the database
        await revokeToken(refreshToken);

        return NextResponse.json({ success: true, message: "Logged out successfully" }, { status: 200 });
    } catch (error: any) {
        console.error("Mobile logout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
