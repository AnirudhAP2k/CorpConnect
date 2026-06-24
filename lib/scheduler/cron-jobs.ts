import cron from "node-cron";
import {
    processJobQueue,
} from "@/lib/jobs/job-processor";
import { cleanupOldJobs } from "@/lib/jobs/cleanup-old-jobs";
import { scheduleEventReport } from "@/lib/jobs/scheduleEventReport";

let isInitialized = false;

export function initializeScheduler() {
    if (isInitialized) {
        console.log("[Scheduler] Already initialized, skipping...");
        return;
    }

    console.log("[Scheduler] Initializing cron jobs...");

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
export async function triggerJobProcessing() {
    console.log("[Scheduler] Manual trigger: Process Job Queue");
    await processJobQueue();
}

export async function triggerCleanup() {
    console.log("[Scheduler] Manual trigger: Cleanup Old Jobs");
    await cleanupOldJobs();
}

export async function triggerScheduleEventReport(
    eventId: string,
    endDateTime: Date,
) {
    console.log("[Scheduler] Running: Schedule Event Report");
    await scheduleEventReport(eventId, endDateTime);
}
