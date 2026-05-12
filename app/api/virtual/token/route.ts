import { NextResponse } from "next/server";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

// ─── POST /api/virtual/token ───────────────────────────────────────────────────
// Requests a LiveKit room access token for the authenticated user.
// The full access gate (participation, payment, time window) is enforced in lv-service.
//
// Body: { roomId: string }
// Returns: { token: string, livekitUrl: string, roomName: string }
export async function POST(req: Request) {
    const ctx = await getLvAuthContext();
    if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json() as { roomId?: string };

    if (!body.roomId) {
        return NextResponse.json({ error: "MISSING_ROOM_ID" }, { status: 400 });
    }

    const lvRes = await lvFetch("/token", {
        method: "POST",
        body: JSON.stringify({ roomId: body.roomId }),
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();

    // Map lv-service error codes to user-friendly messages for the client
    if (!lvRes.ok) {
        const errorMessages: Record<string, string> = {
            ROOM_NOT_FOUND: "This virtual room no longer exists.",
            ROOM_CLOSED: "This virtual room has been closed by the host.",
            EVENT_NOT_STARTED: "The event hasn't started yet. You can join 15 minutes before it begins.",
            EVENT_ENDED: "This event has already ended.",
            NOT_REGISTERED: "You must be registered for this event to join the virtual session.",
            PAYMENT_REQUIRED: "Please complete payment to join this virtual session.",
        };

        return NextResponse.json(
            {
                error: data.error,
                message: errorMessages[data.error] ?? "Unable to join this session.",
                ...(data.startsAt ? { startsAt: data.startsAt } : {}),
            },
            { status: lvRes.status }
        );
    }

    return NextResponse.json(data);
}
