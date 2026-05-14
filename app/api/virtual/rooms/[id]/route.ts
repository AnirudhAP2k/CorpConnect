import { NextResponse } from "next/server";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

interface Params {
    params: Promise<{ id: string }>;
}

// ─── DELETE /api/virtual/rooms/[id] ───────────────────────────────────────────
// Host closes a virtual room (marks inactive + removes from LiveKit).
export async function DELETE(_req: Request, { params }: Params) {
    const ctx = await getLvAuthContext();
    if (!ctx) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!["OWNER", "ADMIN"].includes(ctx.role)) {
        return NextResponse.json({ error: "INSUFFICIENT_ROLE" }, { status: 403 });
    }

    const { id } = await params;

    const lvRes = await lvFetch(`/rooms/${id}`, {
        method: "DELETE",
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();
    return NextResponse.json(data, { status: lvRes.status });
}

// ─── POST /api/virtual/rooms/[id]/kick ────────────────────────────────────────
// Host removes a specific participant from a room.
// Note: /kick is handled in a separate route file for clarity.
