import { NextRequest, NextResponse } from "next/server";
import {
    triggerInviteProcessing,
    triggerJobProcessing,
    triggerCleanup,
} from "@/lib/scheduler/cron-jobs";

// Manual trigger endpoint for testing/debugging
// POST /api/jobs/trigger
export const POST = async (req: NextRequest) => {
    try {
        const { type } = await req.json();

        // Simple auth check - only allow in development or with secret key
        const authHeader = req.headers.get("authorization");
        const isAuthorized =
            process.env.NODE_ENV === "development" ||
            authHeader === `Bearer ${process.env.JOB_TRIGGER_SECRET}`;

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        switch (type) {
            case "invites":
                await triggerInviteProcessing();
                return NextResponse.json({
                    message: "Invite processing triggered successfully",
                });

            case "jobs":
                await triggerJobProcessing();
                return NextResponse.json({
                    message: "Job queue processing triggered successfully",
                });

            case "cleanup":
                await triggerCleanup();
                return NextResponse.json({
                    message: "Cleanup triggered successfully",
                });

            case "all":
                await triggerInviteProcessing();
                await triggerJobProcessing();
                return NextResponse.json({
                    message: "All jobs triggered successfully",
                });

            default:
                return NextResponse.json(
                    { error: "Invalid job type. Use: invites, jobs, cleanup, or all" },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error("Job trigger error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
};
