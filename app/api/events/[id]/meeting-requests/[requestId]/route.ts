import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueueMatchingRules } from "@/lib/jobs/automation";

/**
 * PATCH /api/events/[id]/meeting-requests/[requestId]
 *   Accept / Decline (receiver org only) / Cancel (sender org only)
 *   Body: { action: "ACCEPT" | "DECLINE" | "CANCEL" }
 *
 * DELETE /api/events/[id]/meeting-requests/[requestId]
 *   Permanently removes a PENDING request (sender only).
 */

const ActionSchema = z.object({
    action: z.enum(["ACCEPT", "DECLINE", "CANCEL"]),
});

export const PATCH = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; requestId: string }> }
) => {
    const { requestId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const { action } = parsed.data;

    const meetingRequest = await prisma.meetingRequest.findUnique({
        where: { id: requestId },
        include: {
            senderOrg: { select: { id: true, name: true } },
            receiverOrg: { select: { id: true, name: true } },
        },
    });
    if (!meetingRequest) return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });

    // Get caller's active org
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });
    const activeOrgId = user?.activeOrganizationId;

    // Verify caller is OWNER/ADMIN of their relevant side
    const isReceiver = activeOrgId === meetingRequest.receiverOrgId;
    const isSender = activeOrgId === meetingRequest.senderOrgId;

    if (!isReceiver && !isSender) {
        return NextResponse.json({ error: "This meeting request does not involve your organization" }, { status: 403 });
    }

    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: activeOrgId!, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) return NextResponse.json({ error: "You must be an admin of your organization" }, { status: 403 });

    // Authorization rules
    if ((action === "ACCEPT" || action === "DECLINE") && !isReceiver) {
        return NextResponse.json({ error: "Only the receiving organization can accept or decline" }, { status: 403 });
    }
    if (action === "CANCEL" && !isSender) {
        return NextResponse.json({ error: "Only the sending organization can cancel" }, { status: 403 });
    }
    if (meetingRequest.status !== "PENDING") {
        return NextResponse.json({ error: `Cannot ${action.toLowerCase()} a request that is already ${meetingRequest.status}` }, { status: 409 });
    }

    const statusMap: Record<string, "ACCEPTED" | "DECLINED" | "CANCELLED"> = {
        ACCEPT: "ACCEPTED",
        DECLINE: "DECLINED",
        CANCEL: "CANCELLED",
    };

    const updated = await prisma.meetingRequest.update({
        where: { id: requestId },
        data: { status: statusMap[action] },
        include: {
            senderOrg: { select: { id: true, name: true } },
            receiverOrg: { select: { id: true, name: true } },
        },
    });

    const notifTypeMap: Record<string, string> = {
        ACCEPT: "MEETING_ACCEPTED",
        DECLINE: "MEETING_DECLINED",
        CANCEL: "MEETING_CANCELLED",
    };
    prisma.jobQueue.create({
        data: {
            type: "SEND_NOTIFICATION",
            payload: { type: notifTypeMap[action], meetingRequestId: requestId },
        },
    }).catch(() => { });

    if (action === "ACCEPT") {
        const ctx = {
            meetingRequestId: requestId,
            senderOrgId: meetingRequest.senderOrgId,
            receiverOrgId: meetingRequest.receiverOrgId,
        };
        enqueueMatchingRules("MEETING_SCHEDULED", meetingRequest.senderOrgId, ctx).catch(() => { });
        enqueueMatchingRules("MEETING_SCHEDULED", meetingRequest.receiverOrgId, ctx).catch(() => { });
    }

    return NextResponse.json({ meetingRequest: updated, message: `Meeting request ${statusMap[action].toLowerCase()}` });
};

export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; requestId: string }> }
) => {
    const { requestId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meetingRequest = await prisma.meetingRequest.findUnique({ where: { id: requestId } });
    if (!meetingRequest) return NextResponse.json({ error: "Meeting request not found" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeOrganizationId: true } });
    if (user?.activeOrganizationId !== meetingRequest.senderOrgId) {
        return NextResponse.json({ error: "Only the sender can delete a meeting request" }, { status: 403 });
    }

    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: meetingRequest.senderOrgId, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.meetingRequest.delete({ where: { id: requestId } });
    return NextResponse.json({ message: "Meeting request deleted" });
};
