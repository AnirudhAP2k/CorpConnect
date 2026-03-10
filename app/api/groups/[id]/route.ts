import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGroupById } from "@/data/groups";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.activeOrganizationId || undefined;

        const params = await context.params;
        const groupId = params.id;

        if (!groupId) {
            return NextResponse.json({ error: "Group ID required" }, { status: 400 });
        }

        const group = await getGroupById(groupId, orgId);

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        return NextResponse.json(group);
    } catch (error) {
        console.error("[GET_GROUP_BY_ID]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
