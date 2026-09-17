import { NextResponse } from "next/server";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

async function forwardSessionRequest(req: Request, leave = false) {
    const ctx = await getLvAuthContext();
    if (!ctx) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json() as { roomId?: string; action?: "leave" };
    if (!body.roomId) {
        return NextResponse.json({ error: "MISSING_ROOM_ID" }, { status: 400 });
    }

    const path = leave || body.action === "leave" ? "/sessions/leave" : "/sessions";
    const lvRes = await lvFetch(path, {
        method: "POST",
        body: JSON.stringify({ roomId: body.roomId }),
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();
    return NextResponse.json(data, { status: lvRes.status });
}

export async function POST(req: Request) {
    return forwardSessionRequest(req);
}

export async function DELETE(req: Request) {
    return forwardSessionRequest(req, true);
}
