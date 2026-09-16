import { NextResponse } from "next/server";

const LV_SERVICE_URL = process.env.LV_SERVICE_URL;

export async function POST(req: Request) {
    if (!LV_SERVICE_URL) {
        return NextResponse.json(
            { error: "LV_SERVICE_UNAVAILABLE" },
            { status: 503 },
        );
    }

    const authorization = req.headers.get("authorization");
    if (!authorization) {
        return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 401 });
    }

    try {
        const body = await req.text();
        const lvRes = await fetch(`${LV_SERVICE_URL}/webhooks/livekit`, {
            method: "POST",
            headers: {
                "Authorization": authorization,
                "Content-Type": req.headers.get("content-type") ?? "application/webhook+json",
            },
            body,
        });

        const responseBody = await lvRes.text();
        return new NextResponse(responseBody, {
            status: lvRes.status,
            headers: {
                "Content-Type": lvRes.headers.get("content-type") ?? "application/json",
            },
        });
    } catch (err) {
        console.error("[LiveKit webhook proxy]", err);
        return NextResponse.json(
            { error: "LV_SERVICE_UNAVAILABLE" },
            { status: 503 },
        );
    }
}
