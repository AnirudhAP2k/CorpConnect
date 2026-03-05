import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET  /api/organizations/[id]/connections
 *   Returns connections involving this org: accepted, pending-sent, pending-received.
 *   Also used to check the connection status between the calling org and this org.
 *   Query param: ?perspective=<myOrgId>  → filters to relationship with that org
 *
 * POST /api/organizations/[id]/connections
 *   Send a connection request FROM the caller's active org TO org[id].
 *   Body: { message?: string }
 */

const SendRequestSchema = z.object({
    message: z.string().max(500).optional(),
});

export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: targetOrgId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const perspective = searchParams.get("perspective"); // callerOrgId

    const where = perspective
        ? {
            OR: [
                { sourceOrgId: perspective, targetOrgId },
                { sourceOrgId: targetOrgId, targetOrgId: perspective },
            ],
        }
        : {
            OR: [
                { sourceOrgId: targetOrgId },
                { targetOrgId },
            ],
        };

    const connections = await prisma.orgConnection.findMany({
        where,
        include: {
            sourceOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            targetOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ connections });
};

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: targetOrgId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Validate body
    let message: string | undefined;
    try {
        const body = await req.json();
        const parsed = SendRequestSchema.parse(body);
        message = parsed.message;
    } catch {
        // message is optional — ignore parse errors
    }

    // Get the caller's active org
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });

    const sourceOrgId = user?.activeOrganizationId;
    if (!sourceOrgId) {
        return NextResponse.json({ error: "You must have an active organization to send connection requests" }, { status: 400 });
    }

    if (sourceOrgId === targetOrgId) {
        return NextResponse.json({ error: "Cannot connect an organization to itself" }, { status: 400 });
    }

    // Verify caller is OWNER or ADMIN of source org
    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: sourceOrgId, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) {
        return NextResponse.json({ error: "You must be an admin of your organization to send requests" }, { status: 403 });
    }

    // Check if connection already exists (either direction)
    const existing = await prisma.orgConnection.findFirst({
        where: {
            OR: [
                { sourceOrgId, targetOrgId },
                { sourceOrgId: targetOrgId, targetOrgId: sourceOrgId },
            ],
        },
    });

    if (existing) {
        return NextResponse.json({ error: "A connection request already exists", existing }, { status: 409 });
    }

    const connection = await prisma.orgConnection.create({
        data: {
            sourceOrgId,
            targetOrgId,
            initiatedByUserId: userId,
            message,
            status: "PENDING",
        },
        include: {
            sourceOrg: { select: { id: true, name: true } },
            targetOrg: { select: { id: true, name: true } },
        },
    });

    // Fire-and-forget: enqueue notification for target org admins
    prisma.jobQueue.create({
        data: {
            type: "SEND_NOTIFICATION",
            payload: {
                type: "CONNECTION_REQUEST",
                connectionId: connection.id,
            },
        },
    }).catch(() => { });

    return NextResponse.json({ connection, message: "Connection request sent" }, { status: 201 });
};
