import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/admin/organizations/[id]/verify
 *
 * Admin action to approve or reject an org that passed Level 1 KYB.
 * Body: { action: "approve" | "reject"; note?: string }
 */

export const PATCH = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAppAdmin: true },
    });
    if (!admin?.isAppAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const action: "approve" | "reject" = body.action;
    const note: string | undefined = body.note;

    if (!["approve", "reject"].includes(action)) {
        return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true, meta: { select: { verificationStatus: true } } },
    });

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const currentStatus = org.meta?.verificationStatus;

    if (currentStatus !== "IN_REVIEW") {
        return NextResponse.json(
            { error: `Org is not IN_REVIEW (current status: ${currentStatus ?? "no meta"})` },
            { status: 409 }
        );
    }

    if (action === "approve") {
        await prisma.$transaction([
            prisma.organizationMeta.update({
                where: { organizationId: id },
                data: {
                    verificationStatus: "VERIFIED",
                    verifiedAt: new Date(),
                    verificationReviewNote: note ?? null,
                },
            }),
            prisma.organization.update({
                where: { id },
                data: { isVerified: true },
            }),
        ]);
        return NextResponse.json({ ok: true, decision: "VERIFIED", orgId: id });
    } else {
        await prisma.organizationMeta.update({
            where: { organizationId: id },
            data: {
                verificationStatus: "REJECTED",
                verificationReviewNote: note ?? "Rejected by admin.",
            },
        });
        return NextResponse.json({ ok: true, decision: "REJECTED", orgId: id });
    }
};
