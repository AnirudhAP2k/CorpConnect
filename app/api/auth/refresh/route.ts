import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateRefreshToken } from "@/lib/tokens";
import { SignJWT } from "jose";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refreshToken")?.value;

        if (!refreshToken) {
            return NextResponse.json({ error: "No refresh token" }, { status: 401 });
        }

        const newToken = await rotateRefreshToken(refreshToken);

        cookieStore.set("refreshToken", newToken.token, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
            expires: newToken.expiresAt,
        });

        const accessToken = await new SignJWT({
            sub: newToken.userId,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("15m")
            .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

        return NextResponse.json({ accessToken });

    } catch (error) {
        return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    }
}
