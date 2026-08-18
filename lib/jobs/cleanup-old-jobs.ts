import { prisma } from "@/lib/db";
import { requeueFailedScans } from "@/domain/file-uploads/scan";

export async function cleanupOldJobs() {
    console.log("[Job Processor] Cleaning up old jobs & checking quarantined uploads...");

    try {
        // Re-queue any quarantined uploads whose scanner timed out / suffered an outage
        await requeueFailedScans();

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
