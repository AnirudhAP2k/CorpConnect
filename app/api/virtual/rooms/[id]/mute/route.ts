import { NextResponse } from "next/server";
import { getLvAuthContext, lvFetch } from "@/lib/lv-service";

interface Params {
    params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
    const ctx = await getLvAuthContext();
    if (!ctx) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json() as {
        participantIdentity?: string;
        trackSid?: string;
        muted?: boolean;
    };

    if (!body.participantIdentity || !body.trackSid) {
        return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const lvRes = await lvFetch(`/rooms/${id}/mute`, {
        method: "POST",
        body: JSON.stringify({
            participantIdentity: body.participantIdentity,
            trackSid: body.trackSid,
            muted: body.muted ?? true,
        }),
        userId: ctx.userId,
        activeOrgId: ctx.activeOrgId,
        role: ctx.role,
    });

    const data = await lvRes.json();
    return NextResponse.json(data, { status: lvRes.status });
}
