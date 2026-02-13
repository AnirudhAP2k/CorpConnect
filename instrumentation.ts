export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "development") {
        const { initializeScheduler } = await import("@/lib/scheduler/cron-jobs");
        initializeScheduler();
    }
}
