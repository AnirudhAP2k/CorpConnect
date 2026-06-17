import { NextRequest, NextResponse } from "next/server";
import { isUUID } from "@/lib/utils";
import { getApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
    getCredentialByOrgId,
    generateCredential,
    revokeCredential,
} from "@/domain/api-credentials";

/**
 * API Credential management for an organization.
 * Only OWNER role can access these endpoints.
 *
 * GET    /api/organizations/[id]/api-credentials  → fetch credential info (prefix only)
 * POST   /api/organizations/[id]/api-credentials  → generate new key (full key returned ONCE)
 * DELETE /api/organizations/[id]/api-credentials  → revoke key
 */

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function assertOwner(userId: string, orgId: string): Promise<boolean> {
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });
    return member?.role === "OWNER";
}

async function assertOrg(orgId: string): Promise<boolean> {
    if (!isUUID(orgId)) return false;
    const count = await prisma.organization.count({ where: { id: orgId } });
    return count > 0;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

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
    if (!(await assertOwner(user.id, orgId)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const credential = await getCredentialByOrgId(orgId);

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

    const result = await generateCredential(orgId);

    return NextResponse.json({
        tenantId: result.tenantId,
        apiKey: result.apiKey,
        apiKeyPrefix: result.apiKeyPrefix,
        tier: result.tier,
        usageLimit: result.usageLimit,
        warning: "Save this key — it will not be shown again.",
    }, { status: 201 });
};

// DELETE — revoke API key
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

    await revokeCredential(orgId);
    return NextResponse.json({ ok: true });
};
