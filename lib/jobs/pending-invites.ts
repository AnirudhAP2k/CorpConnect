import { prisma } from "@/lib/db";
import { sendMemberInviteEmail } from "@/lib/email-templates/member-invite";

// ─── Invite email handler ─────────────────────────────────────────────────────

/**
 * Processes a single invite email delivery.
 * Fetches the PendingInvite, validates it's still actionable,
 * sends the email, and updates its status.
 */
export async function processInviteEmail(payload: { inviteId: string }) {
    const invite = await prisma.pendingInvite.findUnique({
        where: { id: payload.inviteId },
        include: {
            organization: true,
            inviter: true,
        },
    });

    if (!invite) {
        throw new Error(`PendingInvite ${payload.inviteId} not found`);
    }

    // Skip if already sent/accepted/failed/expired
    if (invite.status !== "PENDING") {
        console.log(`[Job Processor] Invite ${invite.id} is ${invite.status}, skipping`);
        return;
    }

    // Skip if expired
    if (invite.expiresAt < new Date()) {
        await prisma.pendingInvite.update({
            where: { id: invite.id },
            data: { status: "EXPIRED" },
        });
        console.log(`[Job Processor] Invite ${invite.id} expired, marked as EXPIRED`);
        return;
    }

    // Track the attempt
    await prisma.pendingInvite.update({
        where: { id: invite.id },
        data: {
            attempts: invite.attempts + 1,
            lastAttempt: new Date(),
        },
    });

    // Generate invite link and send
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

    try {
        await sendMemberInviteEmail({
            organizationName: invite.organization.name,
            inviterName: invite.inviter.name || "Someone",
            role: invite.role,
            inviteLink,
            recipientEmail: invite.email,
        });

        await prisma.pendingInvite.update({
            where: { id: invite.id },
            data: { status: "SENT", error: null },
        });

        console.log(`[Job Processor] ✓ Sent invite to ${invite.email}`);
    } catch (emailError: any) {
        // Update invite with error; if max attempts exhausted the JobQueue
        // processor will mark the *job* as FAILED and stop retrying
        await prisma.pendingInvite.update({
            where: { id: invite.id },
            data: {
                error: emailError.message,
                // Keep PENDING so a re-enqueued job can retry
                status: invite.attempts + 1 >= invite.maxAttempts ? "FAILED" : "PENDING",
            },
        });

        // Re-throw so processJobQueue marks the job as failed / retries
        throw emailError;
    }
}

// ─── Expired invite cleanup ───────────────────────────────────────────────────

/**
 * Marks stale PENDING/SENT invites as EXPIRED.
 * Called during the CLEANUP_DATA job cycle.
 */
export async function expireStalePendingInvites() {
    const result = await prisma.pendingInvite.updateMany({
        where: {
            status: { in: ["PENDING", "SENT"] },
            expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
    });

    if (result.count > 0) {
        console.log(`[Job Processor] Marked ${result.count} expired invite(s)`);
    }
}
