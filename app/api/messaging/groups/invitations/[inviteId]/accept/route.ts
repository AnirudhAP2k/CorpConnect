import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { acceptGroupInviteAction, rejectGroupInviteAction } from "@/domain/messaging";

/** POST /api/messaging/groups/invitations/[inviteId]/accept */
export const POST = async (
    _req: NextRequest,
    { params }: { params: Promise<{ inviteId: string }> }
) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { inviteId } = await params;
        const result = await acceptGroupInviteAction(inviteId);

        if ("error" in result) {
            const status = result.error.includes("Enterprise") ? 403
                : result.error.includes("not found") ? 404
                : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error("[POST /api/messaging/groups/invitations/[inviteId]/accept]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
};
