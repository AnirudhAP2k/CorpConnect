import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PLAN_API_LIMITS } from "@/constants";
import cryptoJs from "crypto-js";
import { isUUID } from "@/lib/utils";
import { getApiAuth } from "@/lib/api-auth";
import { SubscriptionPlan } from "@prisma/client";

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

async function assertOrg(orgId: string): Promise<boolean> {
    if (!isUUID(orgId)) {
        return false;
    }

    const org = await prisma.organization.count({
        where: { id: orgId },
    });

    return org > 0;
}

// GET — fetch current credential metadata (never the real key)
export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    if (!(await assertOrg(orgId))) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const user = getApiAuth(req);
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.log(user);
    if (!(await assertOwner(user.id, orgId)))
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

    if (!credential) {
        return NextResponse.json({ error: "No credentials found." }, { status: 404 });
    }

    return NextResponse.json(credential);
};

// POST — generate (or regenerate) API key — returns full key ONCE
export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    if (!(await assertOrg(orgId))) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const user = getApiAuth(req);
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertOwner(user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rawKey = `corp_connect_${process.env.NODE_ENV}_${cryptoJs.lib.WordArray.random(64).toString(cryptoJs.enc.Hex)}`;
    const prefix = rawKey.slice(0, 35);
    const hashed = await bcrypt.hash(rawKey, 12);

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionPlan: true },
    });

    const tier = (org?.subscriptionPlan ?? "FREE") as SubscriptionPlan;
    const usageLimit = PLAN_API_LIMITS[tier];

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
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    if (!(await assertOrg(orgId))) {
        return NextResponse.json({ error: "Invalid organization ID" }, { status: 400 });
    }

    const user = getApiAuth(req);
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertOwner(user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.apiCredential.deleteMany({ where: { organizationId: orgId } });
    return NextResponse.json({ ok: true });
};
