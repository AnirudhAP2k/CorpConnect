import { getApiAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { getGroupMessages } from "@/domain/messaging";

/** GET /api/messaging/groups/[id]/messages?cursor=ISO_DATE — paginated message history */
export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const user = getApiAuth(req);
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: groupId } = await params;
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor") ?? undefined;
        const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 50);

        const result = await getGroupMessages(groupId, user.id, { cursor, limit });
        return NextResponse.json(result, { status: 200 });
    } catch (err: any) {
        const isAuthError = err?.message?.includes("not a member");
        console.error("[GET /api/messaging/groups/[id]/messages]", err);
        return NextResponse.json(
            { error: isAuthError ? "Forbidden" : "Failed to fetch messages." },
            { status: isAuthError ? 403 : 500 }
        );
    }
};
