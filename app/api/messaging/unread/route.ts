import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

// ─── GET /api/messaging/unread ─────────────────────────────────────────────────
// Returns the total count of unread messages across all conversations for the
// active org. Used by the Navbar badge to show a global notification dot.

export async function GET(req: NextRequest) {
    const user = getApiAuth(req);
    if (!user?.id) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const activeOrgId = user.activeOrganizationId;
    if (!activeOrgId) {
        return NextResponse.json({ count: 0 });
    }

    const count = await prisma.directMessage.count({
        where: {
            conversation: {
                OR: [{ orgAId: activeOrgId }, { orgBId: activeOrgId }],
            },
            senderOrgId: { not: activeOrgId },
            status: { not: "READ" },
        },
    });

    return NextResponse.json({ count });
}
