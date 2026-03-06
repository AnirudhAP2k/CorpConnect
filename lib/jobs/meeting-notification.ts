import { prisma } from "@/lib/db";
import { sendMeetingRequestEmail } from "@/lib/email-templates/meeting-request";
import type { MeetingEmailEvent } from "@/lib/types";

interface MeetingNotificationPayload {
    type: "MEETING_REQUEST" | "MEETING_ACCEPTED" | "MEETING_DECLINED" | "MEETING_CANCELLED";
    meetingRequestId: string;
}

export async function processMeetingNotification(payload: MeetingNotificationPayload) {
    const { type, meetingRequestId } = payload;

    const mr = await (prisma as any).meetingRequest.findUnique({
        where: { id: meetingRequestId },
        select: {
            id: true,
            agenda: true,
            proposedTime: true,
            event: { select: { id: true, title: true } },
            senderOrg: {
                select: {
                    id: true,
                    name: true,
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        select: { user: { select: { name: true, email: true } } },
                    },
                },
            },
            receiverOrg: {
                select: {
                    id: true,
                    name: true,
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        select: { user: { select: { name: true, email: true } } },
                    },
                },
            },
        },
    });

    if (!mr) {
        console.warn(`[Job] MeetingRequest ${meetingRequestId} not found`);
        return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventLink = `${appUrl}/events/${mr.event.id}`;

    const emailEventMap: Record<string, { emailEvent: MeetingEmailEvent; notifyOrg: any; actorOrg: any }> = {
        MEETING_REQUEST: { emailEvent: "REQUESTED", notifyOrg: mr.receiverOrg, actorOrg: mr.senderOrg },
        MEETING_ACCEPTED: { emailEvent: "ACCEPTED", notifyOrg: mr.senderOrg, actorOrg: mr.receiverOrg },
        MEETING_DECLINED: { emailEvent: "DECLINED", notifyOrg: mr.senderOrg, actorOrg: mr.receiverOrg },
        MEETING_CANCELLED: { emailEvent: "CANCELLED", notifyOrg: mr.receiverOrg, actorOrg: mr.senderOrg },
    };

    const meta = emailEventMap[type];
    if (!meta) { console.warn(`[Job] Unknown meeting notif type: ${type}`); return; }

    const recipients = (meta.notifyOrg.members as any[])
        .map((m: any) => ({ name: m.user.name || "Admin", email: m.user.email }))
        .filter((r: any) => !!r.email);

    if (recipients.length === 0) { console.warn(`[Job] No admin emails for org ${meta.notifyOrg.id}`); return; }

    await Promise.allSettled(
        recipients.map((r: any) =>
            sendMeetingRequestEmail({
                event: meta.emailEvent,
                recipientEmail: r.email,
                recipientName: r.name,
                actorOrgName: meta.actorOrg.name,
                eventTitle: mr.event.title,
                agenda: mr.agenda ?? undefined,
                proposedTime: mr.proposedTime?.toISOString() ?? undefined,
                eventLink,
            })
        )
    );

    console.log(`[Job] ✓ ${meta.emailEvent} meeting notification sent for request ${meetingRequestId}`);
}
