import { NextResponse } from "next/server";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

interface Params {
    params: Promise<{ id: string }>;
}

// ─── POST /api/virtual/rooms/[id]/kick ────────────────────────────────────────
// Host removes a specific participant (by their userId) from the LiveKit room.
export async function POST(req: Request, { params }: Params) {
    const ctx = await getLvAuthContext();
    if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!["OWNER", "ADMIN"].includes(ctx.role)) {
        return NextResponse.json({ error: "INSUFFICIENT_ROLE" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json() as { participantIdentity?: string };

    if (!body.participantIdentity) {
        return NextResponse.json({ error: "MISSING_PARTICIPANT_IDENTITY" }, { status: 400 });
    }

    const lvRes = await lvFetch(`/rooms/${id}/kick`, {
        method: "POST",
        body: JSON.stringify(body),
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();
    return NextResponse.json(data, { status: lvRes.status });
}
