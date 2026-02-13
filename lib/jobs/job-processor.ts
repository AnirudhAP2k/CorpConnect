import { prisma } from "@/lib/db";
import { sendMemberInviteEmail } from "@/lib/email-templates/member-invite";

export async function processPendingInvites() {
    console.log("[Job Processor] Processing pending invites...");

    try {
        // Fetch pending invites that haven't exceeded max attempts
        const pendingInvites = await prisma.pendingInvite.findMany({
            where: {
                status: "PENDING",
                attempts: {
                    lt: prisma.pendingInvite.fields.maxAttempts,
                },
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                organization: true,
                inviter: true,
            },
            take: 10, // Process 10 at a time
        });

        console.log(`[Job Processor] Found ${pendingInvites.length} pending invites`);

        for (const invite of pendingInvites) {
            try {
                // Mark as processing
                await prisma.pendingInvite.update({
                    where: { id: invite.id },
                    data: {
                        attempts: invite.attempts + 1,
                        lastAttempt: new Date(),
                    },
                });

                // Generate invite link
                const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;

                // Send email
                await sendMemberInviteEmail({
                    organizationName: invite.organization.name,
                    inviterName: invite.inviter.name || "Someone",
                    role: invite.role,
                    inviteLink,
                    recipientEmail: invite.email,
                });

                // Update status to SENT
                await prisma.pendingInvite.update({
                    where: { id: invite.id },
                    data: {
                        status: "SENT",
                        error: null,
                    },
                });

                console.log(`[Job Processor] ✓ Sent invite to ${invite.email}`);
            } catch (error: any) {
                console.error(`[Job Processor] ✗ Failed to send invite to ${invite.email}:`, error.message);

                // Update with error
                await prisma.pendingInvite.update({
                    where: { id: invite.id },
                    data: {
                        status: invite.attempts + 1 >= invite.maxAttempts ? "FAILED" : "PENDING",
                        error: error.message,
                    },
                });
            }
        }

        // Mark expired invites
        await prisma.pendingInvite.updateMany({
            where: {
                status: {
                    in: ["PENDING", "SENT"],
                },
                expiresAt: {
                    lt: new Date(),
                },
            },
            data: {
                status: "EXPIRED",
            },
        });

        console.log("[Job Processor] ✓ Finished processing invites");
    } catch (error) {
        console.error("[Job Processor] Error processing invites:", error);
    }
}

export async function processJobQueue() {
    console.log("[Job Processor] Processing job queue...");

    try {
        // Fetch pending jobs
        const pendingJobs = await prisma.jobQueue.findMany({
            where: {
                status: "PENDING",
                attempts: {
                    lt: prisma.jobQueue.fields.maxAttempts,
                },
                scheduledAt: {
                    lte: new Date(),
                },
            },
            take: 20, // Process 20 at a time
            orderBy: {
                scheduledAt: "asc",
            },
        });

        console.log(`[Job Processor] Found ${pendingJobs.length} pending jobs`);

        for (const job of pendingJobs) {
            try {
                // Mark as processing
                await prisma.jobQueue.update({
                    where: { id: job.id },
                    data: {
                        status: "PROCESSING",
                        attempts: job.attempts + 1,
                    },
                });

                // Process based on job type
                await processJob(job);

                // Mark as completed
                await prisma.jobQueue.update({
                    where: { id: job.id },
                    data: {
                        status: "COMPLETED",
                        processedAt: new Date(),
                        error: null,
                    },
                });

                console.log(`[Job Processor] ✓ Completed job ${job.id} (${job.type})`);
            } catch (error: any) {
                console.error(`[Job Processor] ✗ Failed job ${job.id}:`, error.message);

                // Update with error
                await prisma.jobQueue.update({
                    where: { id: job.id },
                    data: {
                        status: job.attempts + 1 >= job.maxAttempts ? "FAILED" : "PENDING",
                        error: error.message,
                    },
                });
            }
        }

        console.log("[Job Processor] ✓ Finished processing job queue");
    } catch (error) {
        console.error("[Job Processor] Error processing job queue:", error);
    }
}

async function processJob(job: any) {
    const payload = job.payload as any;

    switch (job.type) {
        case "SEND_INVITE_EMAIL":
            // This is now handled by processPendingInvites
            break;

        case "SEND_NOTIFICATION":
            // TODO: Implement notification sending
            console.log("[Job] Sending notification:", payload);
            break;

        case "SEND_EVENT_REMINDER":
            // TODO: Implement event reminder
            console.log("[Job] Sending event reminder:", payload);
            break;

        case "GENERATE_REPORT":
            // TODO: Implement report generation
            console.log("[Job] Generating report:", payload);
            break;

        case "CLEANUP_DATA":
            // TODO: Implement data cleanup
            console.log("[Job] Cleaning up data:", payload);
            break;

        default:
            throw new Error(`Unknown job type: ${job.type}`);
    }
}

export async function cleanupOldJobs() {
    console.log("[Job Processor] Cleaning up old jobs...");

    try {
        // Delete completed jobs older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const deletedJobs = await prisma.jobQueue.deleteMany({
            where: {
                status: "COMPLETED",
                processedAt: {
                    lt: sevenDaysAgo,
                },
            },
        });

        // Delete expired invites older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedInvites = await prisma.pendingInvite.deleteMany({
            where: {
                status: {
                    in: ["EXPIRED", "ACCEPTED", "FAILED"],
                },
                updatedAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });

        console.log(`[Job Processor] ✓ Deleted ${deletedJobs.count} old jobs and ${deletedInvites.count} old invites`);
    } catch (error) {
        console.error("[Job Processor] Error cleaning up old jobs:", error);
    }
}
