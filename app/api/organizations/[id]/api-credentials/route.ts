import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PLAN_API_LIMITS } from "@/constants";
import { isUUID } from "@/lib/utils";

/**
 * API Credential management for an organization.
 * Only OWNER role can access these endpoints.
 *
 * GET    /api/organizations/[id]/api-credentials  → fetch credential info (prefix only)
 * POST   /api/organizations/[id]/api-credentials  → generate new key (full key returned ONCE)
 * DELETE /api/organizations/[id]/api-credentials  → revoke key
 */

async function assertOwner(userId: string, orgId: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });
    return member?.role === "OWNER";
}

// GET — fetch current credential metadata (never the real key)
export const GET = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;
    const session = await auth();

    if (!isUUID(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertOwner(session.user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const credential = await prisma.apiCredential.findUnique({
        where: { organizationId: orgId },
        select: {
            tenantId: true,
            apiKeyPrefix: true,
            tier: true,
            usageCount: true,
            usageLimit: true,
            lastUsedAt: true,
            createdAt: true,
        },
    });

    return NextResponse.json(credential ?? null);
};

// POST — generate (or regenerate) API key — returns full key ONCE
export const POST = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    if (!isUUID(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertOwner(session.user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rawKey = `evtly_live_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.slice(0, 18);
    const hashed = await bcrypt.hash(rawKey, 12);

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionPlan: true },
    });
    const tier = (org?.subscriptionPlan ?? "FREE") as "FREE" | "PRO" | "ENTERPRISE";
    const usageLimit = PLAN_API_LIMITS[tier] ?? PLAN_API_LIMITS.FREE;

    const credential = await prisma.apiCredential.upsert({
        where: { organizationId: orgId },
        update: {
            apiKey: hashed,
            apiKeyPrefix: prefix,
            tier,
            usageLimit,
            usageCount: 0,
        },
        create: {
            organizationId: orgId,
            apiKey: hashed,
            apiKeyPrefix: prefix,
            tier,
            usageLimit,
        },
    });

    return NextResponse.json({
        tenantId: credential.tenantId,
        apiKey: rawKey,
        apiKeyPrefix: prefix,
        tier: credential.tier,
        usageLimit: credential.usageLimit,
        warning: "Save this key — it will not be shown again.",
    }, { status: 201 });
};

export const DELETE = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    if (!isUUID(orgId)) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertOwner(session.user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.apiCredential.deleteMany({ where: { organizationId: orgId } });
    return NextResponse.json({ ok: true });
};
