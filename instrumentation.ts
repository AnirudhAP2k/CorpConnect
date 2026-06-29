import * as Sentry from "@sentry/nextjs";
import { setupConsoleInterceptor } from "@/lib/file-logger";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        setupConsoleInterceptor();
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: 0.1,
            debug: true,
            integrations: [
                Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
            ],
        });

        if (process.env.NODE_ENV !== "development") {
            const { initializeScheduler } = await import("@/lib/scheduler/cron-jobs");
            initializeScheduler();
        }
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: 0.1,
            debug: true,
            integrations: [
                Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
            ],
        });
    }
}

export const onRequestError = Sentry.captureRequestError;

