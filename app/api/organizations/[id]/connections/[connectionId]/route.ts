import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * PATCH /api/organizations/[id]/connections/[connectionId]
 *   Accept or decline a connection request.
 *   Body: { action: "ACCEPT" | "DECLINE" | "WITHDRAW" }
 *   Only the TARGET org can ACCEPT/DECLINE.
 *   Only the SOURCE org can WITHDRAW.
 */

const ActionSchema = z.object({
    action: z.enum(["ACCEPT", "DECLINE", "WITHDRAW"]),
});

export const PATCH = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; connectionId: string }> }
) => {
    const { id: orgId, connectionId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const { action } = parsed.data;

    // Load connection
    const connection = await prisma.orgConnection.findUnique({
        where: { id: connectionId },
        include: {
            sourceOrg: { select: { id: true, name: true } },
            targetOrg: { select: { id: true, name: true } },
        },
    });

    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    // Verify the org param matches one side of the connection
    if (connection.sourceOrgId !== orgId && connection.targetOrgId !== orgId) {
        return NextResponse.json({ error: "This connection does not involve your organization" }, { status: 403 });
    }

    // Verify caller is OWNER or ADMIN of the relevant side
    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) {
        return NextResponse.json({ error: "You must be an admin of your organization" }, { status: 403 });
    }

    // Authorization rules per action
    if (action === "WITHDRAW" && connection.sourceOrgId !== orgId) {
        return NextResponse.json({ error: "Only the requesting organization can withdraw a connection" }, { status: 403 });
    }
    if ((action === "ACCEPT" || action === "DECLINE") && connection.targetOrgId !== orgId) {
        return NextResponse.json({ error: "Only the receiving organization can accept or decline" }, { status: 403 });
    }
    if (connection.status !== "PENDING") {
        return NextResponse.json({ error: `Cannot ${action.toLowerCase()} a connection that is already ${connection.status}` }, { status: 409 });
    }

    const statusMap: Record<string, "ACCEPTED" | "DECLINED" | "WITHDRAWN"> = {
        ACCEPT: "ACCEPTED",
        DECLINE: "DECLINED",
        WITHDRAW: "WITHDRAWN",
    };

    const updated = await prisma.orgConnection.update({
        where: { id: connectionId },
        data: { status: statusMap[action] },
        include: {
            sourceOrg: { select: { id: true, name: true } },
            targetOrg: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ connection: updated, message: `Connection ${statusMap[action].toLowerCase()}` });
};

export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; connectionId: string }> }
) => {
    const { id: orgId, connectionId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connection = await prisma.orgConnection.findUnique({ where: { id: connectionId } });
    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    if (connection.sourceOrgId !== orgId && connection.targetOrgId !== orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: orgId, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.orgConnection.delete({ where: { id: connectionId } });
    return NextResponse.json({ message: "Connection removed" });
};
