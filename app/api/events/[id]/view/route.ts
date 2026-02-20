import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { recordEventView, updateViewDuration } from "@/data/analytics";

// POST /api/events/[id]/view — record a view session start
export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: eventId } = await params;

    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { sessionId, referrer } = body as { sessionId?: string; referrer?: string };

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        // Validate event exists and is accessible
        const event = await prisma.events.findUnique({
            where: { id: eventId },
            select: { id: true },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        await recordEventView(eventId, userId, sessionId, referrer);

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        console.error("View record error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

// PATCH /api/events/[id]/view — update durationSeconds on page leave (sendBeacon)
export const PATCH = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    await params; // Needed to satisfy Next.js dynamic route typing

    try {
        const body = await req.json().catch(() => ({}));
        const { sessionId, durationSeconds } = body as {
            sessionId?: string;
            durationSeconds?: number;
        };

        if (!sessionId || typeof durationSeconds !== "number") {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        await updateViewDuration(sessionId, durationSeconds);

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        console.error("View duration update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
