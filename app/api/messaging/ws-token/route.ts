import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const TOKEN_TTL_SECONDS = 5 * 60;
const TOKEN_ISSUER = "evently-next";
const TOKEN_AUDIENCE = "evently-ws";

export const dynamic = "force-dynamic";

export async function POST() {
    const session = await auth();
    const userId = session?.user?.id;
    const activeOrgId = session?.user?.activeOrganizationId;

    if (!userId) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!activeOrgId) {
        return NextResponse.json(
            { error: "ACTIVE_ORGANIZATION_REQUIRED" },
            { status: 403 },
        );
    }
    if (!process.env.WS_SERVICE_AUTH_SECRET) {
        console.error("[ws-token] WS_SERVICE_AUTH_SECRET is not configured");
        return NextResponse.json(
            { error: "WS_AUTH_UNAVAILABLE" },
            { status: 503 },
        );
    }

    const secret = new TextEncoder().encode(process.env.WS_SERVICE_AUTH_SECRET);
    const token = await new SignJWT({ userId, activeOrgId })
        .setProtectedHeader({ alg: process.env.HASHING_ALGO || "HS256" })
        .setSubject(userId)
        .setIssuer(TOKEN_ISSUER)
        .setAudience(TOKEN_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
        .sign(secret);

    return NextResponse.json(
        { token, expiresInSeconds: TOKEN_TTL_SECONDS },
        {
            headers: {
                "Cache-Control": "no-store",
            },
        },
    );
}
