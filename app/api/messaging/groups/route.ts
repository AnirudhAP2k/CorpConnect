import { getApiAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import {
    createGroupAction,
    getGroupsForUser,
} from "@/domain/messaging";

/** GET /api/messaging/groups — list all groups for the calling user */
export const GET = async (req: NextRequest) => {
    const user = getApiAuth(req);
    if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const groups = await getGroupsForUser(user.id);
        return NextResponse.json(groups, { status: 200 });
    } catch (err) {
        console.error("[GET /api/messaging/groups]", err);
        return NextResponse.json({ error: "Failed to fetch groups." }, { status: 500 });
    }
};

/** POST /api/messaging/groups — create a new Enterprise group */
export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const result = await createGroupAction(body);

        if ("error" in result) {
            const status = result.error.includes("Enterprise") ? 403 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        console.error("[POST /api/messaging/groups]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
};
