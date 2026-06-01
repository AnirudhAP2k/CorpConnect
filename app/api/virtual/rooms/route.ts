import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { JobType } from "@prisma/client";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

// ─── GET /api/virtual/rooms?eventId= ──────────────────────────────────────────
// Lists active virtual rooms for an event.
// Available to any logged-in user who can view the event.
export async function GET(req: Request) {
    const ctx = await getLvAuthContext();
    if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
        return NextResponse.json({ error: "MISSING_EVENT_ID" }, { status: 400 });
    }

    // Verify the event exists and the user can access it (basic existence check)
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: { id: true, eventType: true },
    });

    if (!event) {
        return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    if (!["ONLINE", "HYBRID"].includes(event.eventType)) {
        return NextResponse.json({ error: "NOT_VIRTUAL_EVENT" }, { status: 400 });
    }

    const lvRes = await lvFetch(`/rooms?eventId=${eventId}`, {
        method: "GET",
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();
    return NextResponse.json(data, { status: lvRes.status });
}

// ─── POST /api/virtual/rooms ───────────────────────────────────────────────────
// Host creates a new virtual room for an event.
// Requires: OWNER or ADMIN of the hosting organization.
export async function POST(req: Request) {
    const ctx = await getLvAuthContext();
    if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!["OWNER", "ADMIN"].includes(ctx.role)) {
        return NextResponse.json({ error: "INSUFFICIENT_ROLE" }, { status: 403 });
    }

    const body = await req.json() as { eventId?: string; name?: string; maxParticipants?: number };

    if (!body.eventId || !body.name?.trim()) {
        return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const lvRes = await lvFetch("/rooms", {
        method: "POST",
        body: JSON.stringify(body),
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();

    if (lvRes.ok && data.room?.id) {
        prisma.jobQueue.create({
            data: {
                type: JobType.VIRTUAL_ROOM_OPENED,
                payload: {
                    roomId: data.room.id,
                    eventId: body.eventId,
                },
            },
        }).catch((err) => console.error("[VirtualRoom] Failed to enqueue VIRTUAL_ROOM_OPENED:", err));
    }

    return NextResponse.json(data, { status: lvRes.status });
}
