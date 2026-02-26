import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";

/**
 * GET /api/admin/ai-token
 *
 * Returns a short-lived master JWT that can be used to authenticate against
 * the AI service (Authorization: Bearer <token>).
 *
 * Only accessible to authenticated users with isAppAdmin === true.
 */
export const GET = async () => {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isAppAdmin) {
        return NextResponse.json({ error: "Forbidden — app admins only" }, { status: 403 });
    }

    const masterKey = process.env.AI_SERVICE_MASTER_KEY;
    if (!masterKey) {
        return NextResponse.json({ error: "AI_SERVICE_MASTER_KEY not configured" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(masterKey);

    const token = await new SignJWT({ role: "master" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secret);

    return NextResponse.json({
        token,
        expiresIn: 3600,
    });
};
