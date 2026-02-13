import cron from "node-cron";
import {
    processPendingInvites,
    processJobQueue,
    cleanupOldJobs,
} from "@/lib/jobs/job-processor";

let isInitialized = false;

export function initializeScheduler() {
    if (isInitialized) {
        console.log("[Scheduler] Already initialized, skipping...");
        return;
    }

    console.log("[Scheduler] Initializing cron jobs...");

    // Process pending invites every 2 minutes
    cron.schedule("*/2 * * * *", async () => {
        console.log("[Scheduler] Running: Process Pending Invites");
        await processPendingInvites();
    });

    // Process job queue every minute
    cron.schedule("* * * * *", async () => {
        console.log("[Scheduler] Running: Process Job Queue");
        await processJobQueue();
    });

    // Cleanup old jobs daily at 2 AM
    cron.schedule("0 2 * * *", async () => {
        console.log("[Scheduler] Running: Cleanup Old Jobs");
        await cleanupOldJobs();
    });

    isInitialized = true;
    console.log("[Scheduler] ✓ All cron jobs initialized successfully");
}

// Export for manual triggering (useful for testing)
export async function triggerInviteProcessing() {
    console.log("[Scheduler] Manual trigger: Process Pending Invites");
    await processPendingInvites();
}

export async function triggerJobProcessing() {
    console.log("[Scheduler] Manual trigger: Process Job Queue");
    await processJobQueue();
}

export async function triggerCleanup() {
    console.log("[Scheduler] Manual trigger: Cleanup Old Jobs");
    await cleanupOldJobs();
}
