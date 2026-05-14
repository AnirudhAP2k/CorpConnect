import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { OrgKybSchema } from "@/lib/validation";

/**
 * PATCH /api/organizations/[id]/meta
 *
 * Saves KYB identity fields (registration number, tax ID, incorporation date,
 * registered address, jurisdiction) into OrganizationMeta.
 *
 * Only OWNER or ADMIN members of the org may call this.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orgId } = await params;

    // Role-check
    const member = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId },
        select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
        return NextResponse.json({ error: "Forbidden — OWNER or ADMIN required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = OrgKybSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid KYB data", details: parsed.error.errors }, { status: 400 });
    }

    const { registrationNumber, jurisdiction, taxId, incorporationDate, registeredAddress } = parsed.data;

    await prisma.organizationMeta.upsert({
        where: { organizationId: orgId },
        create: {
            organizationId: orgId,
            registrationNumber: registrationNumber || null,
            jurisdiction: jurisdiction || null,
            taxId: taxId || null,
            incorporationDate: incorporationDate ? new Date(incorporationDate) : null,
            registeredAddress: registeredAddress || null,
            verificationStatus: "IN_REVIEW",
        },
        update: {
            registrationNumber: registrationNumber || null,
            jurisdiction: jurisdiction || null,
            taxId: taxId || null,
            incorporationDate: incorporationDate ? new Date(incorporationDate) : null,
            registeredAddress: registeredAddress || null,
            verificationStatus: "IN_REVIEW",
        },
    });

    // Enqueue verification job for admin notification & Level-2 processing
    await prisma.jobQueue.create({
        data: {
            type: "VERIFY_ORG_LEVEL_2",
            payload: { orgId, creatorEmail: session?.user?.email ?? "unknown" },
        },
    });

    return NextResponse.json({ ok: true, message: "KYB information saved." });
}

/**
 * GET /api/organizations/[id]/meta
 * Returns current OrganizationMeta fields (for pre-filling the form).
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: orgId } = await params;

    const meta = await prisma.organizationMeta.findUnique({
        where: { organizationId: orgId },
        select: {
            verificationStatus: true,
            verificationScore: true,
            registrationNumber: true,
            jurisdiction: true,
            taxId: true,
            incorporationDate: true,
            registeredAddress: true,
        },
    });

    return NextResponse.json(meta ?? {});
}
