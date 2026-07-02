import { prisma } from "@/lib/db";
import { sendEventInviteEmail } from "@/lib/email-templates/event-invite";
import { format } from "date-fns";

// ─── Payload Type ─────────────────────────────────────────────────────────────

export interface EventInviteEmailPayload {
    inviteId: string;
    email: string;
    token: string;
}

// ─── Job Handler ──────────────────────────────────────────────────────────────

/**
 * Processes a SEND_EVENT_INVITE_EMAIL job.
 * Retrieves the invite record, builds the tokenized URL, sends the email,
 * and marks the invite status as SENT.
 *
 * Idempotent: skips if the invite is no longer PENDING (e.g. already SENT or ACCEPTED).
 */
export async function processEventInviteEmail(payload: EventInviteEmailPayload): Promise<void> {
    const invite = await prisma.eventInvite.findUnique({
        where: { id: payload.inviteId },
        include: {
            event: {
                select: {
                    title: true,
                    id: true,
                    startDateTime: true,
                    endDateTime: true,
                    location: true,
                },
            },
            inviter: {
                select: {
                    name: true,
                },
            },
        },
    });

    if (!invite) {
        throw new Error(`Event invite ${payload.inviteId} not found`);
    }

    // Idempotent guard — skip if already processed
    if (invite.status !== "PENDING") {
        console.log(`[EventInvite] Skipping invite ${invite.id} — status is ${invite.status}`);
        return;
    }

    // Check if invite has expired
    if (invite.expiresAt < new Date()) {
        console.log(`[EventInvite] Skipping expired invite ${invite.id}`);
        await prisma.eventInvite.update({
            where: { id: invite.id },
            data: { status: "EXPIRED" },
        });
        return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/events/invite/${payload.token}`;

    const eventDate = invite.event.startDateTime
        ? format(new Date(invite.event.startDateTime), "EEEE, MMMM dd, yyyy 'at' h:mm a")
        : undefined;

    await sendEventInviteEmail({
        eventName: invite.event.title,
        inviterName: invite.inviter.name || "A colleague",
        inviteUrl,
        recipientEmail: invite.email,
        eventDate,
        eventLocation: invite.event.location || undefined,
    });

    await prisma.eventInvite.update({
        where: { id: invite.id },
        data: { status: "SENT" },
    });

    console.log(`[EventInvite] ✓ Sent invite email to ${invite.email} for event "${invite.event.title}"`);
}
