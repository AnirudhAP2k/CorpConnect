import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET /api/events/[id]/meeting-requests
 *   Lists meeting requests for this event from the perspective of the caller's active org.
 *   Returns both sent and received requests.
 *
 * POST /api/events/[id]/meeting-requests
 *   Sends a meeting request from the caller's active org to a target org.
 *   Body: { receiverOrgId, agenda?, proposedTime? }
 */

const SendRequestSchema = z.object({
    receiverOrgId: z.string().uuid(),
    agenda: z.string().max(1000).optional(),
    proposedTime: z.string().datetime().optional(),
});

export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: eventId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });
    const activeOrgId = user?.activeOrganizationId;
    if (!activeOrgId) {
        return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const requests = await prisma.meetingRequest.findMany({
        where: {
            eventId,
            OR: [{ senderOrgId: activeOrgId }, { receiverOrgId: activeOrgId }],
        },
        include: {
            senderOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            receiverOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ requests, activeOrgId });
};

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: eventId } = await params;
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = SendRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request body", details: parsed.error.format() }, { status: 400 });
    }
    const { receiverOrgId, agenda, proposedTime } = parsed.data;

    // Resolve caller's active org
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });
    const senderOrgId = user?.activeOrganizationId;
    if (!senderOrgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

    // Prevent self-request
    if (senderOrgId === receiverOrgId) {
        return NextResponse.json({ error: "Cannot send a meeting request to your own organization" }, { status: 400 });
    }

    // Caller must be OWNER or ADMIN
    const membership = await prisma.organizationMember.findFirst({
        where: { organizationId: senderOrgId, userId, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!membership) {
        return NextResponse.json({ error: "You must be an admin of your organization to send meeting requests" }, { status: 403 });
    }

    // Both orgs must be registered for the event
    const [senderParticipation, receiverParticipation, event] = await Promise.all([
        prisma.eventParticipation.findFirst({ where: { eventId, organizationId: senderOrgId } }),
        prisma.eventParticipation.findFirst({ where: { eventId, organizationId: receiverOrgId } }),
        prisma.events.findUnique({ where: { id: eventId }, select: { id: true, title: true } }),
    ]);

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (!senderParticipation) {
        return NextResponse.json({ error: "Your organization must be registered for this event to send meeting requests" }, { status: 403 });
    }
    if (!receiverParticipation) {
        return NextResponse.json({ error: "The target organization is not registered for this event" }, { status: 400 });
    }

    // Check for existing request (either direction)
    const existing = await prisma.meetingRequest.findFirst({
        where: {
            eventId,
            OR: [
                { senderOrgId, receiverOrgId },
                { senderOrgId: receiverOrgId, receiverOrgId: senderOrgId },
            ],
        },
    });
    if (existing) {
        return NextResponse.json({ error: "A meeting request already exists between these organizations for this event", existing }, { status: 409 });
    }

    const meetingRequest = await prisma.meetingRequest.create({
        data: {
            eventId,
            senderOrgId,
            receiverOrgId,
            agenda: agenda ?? null,
            proposedTime: proposedTime ? new Date(proposedTime) : null,
            initiatedByUserId: userId,
        },
        include: {
            senderOrg: { select: { id: true, name: true } },
            receiverOrg: { select: { id: true, name: true } },
        },
    });

    // Fire-and-forget notification job
    prisma.jobQueue.create({
        data: {
            type: "SEND_NOTIFICATION",
            payload: { type: "MEETING_REQUEST", meetingRequestId: meetingRequest.id },
        },
    }).catch(() => { });

    return NextResponse.json({ meetingRequest, message: "Meeting request sent" }, { status: 201 });
};
