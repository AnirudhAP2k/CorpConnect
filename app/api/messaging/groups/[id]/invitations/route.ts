import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { inviteToGroupAction } from "@/domain/messaging";
import { z } from "zod";

const InviteSchema = z.object({
    inviteeUserId: z.string().uuid("Invalid user ID."),
});

/** POST /api/messaging/groups/[id]/invitations — invite a user to a group */
export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: groupId } = await params;
        const body = await req.json();

        const parsed = InviteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0].message },
                { status: 400 }
            );
        }

        const result = await inviteToGroupAction({
            groupId,
            inviteeUserId: parsed.data.inviteeUserId,
        });

        if ("error" in result) {
            const status = result.error.includes("Enterprise") ? 403
                : result.error.includes("not found") ? 404
                : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error("[POST /api/messaging/groups/[id]/invitations]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
};
