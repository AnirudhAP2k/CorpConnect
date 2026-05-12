import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 30;

// ─── GET /api/messaging/conversations/[id]/messages ───────────────────────────
// Cursor-based paginated message history for a conversation.
// Query params:
//   before=<messageId>   — load messages older than this ID (for infinite scroll)
//   limit=<n>            — max 50, default 30

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) {
        return NextResponse.json({ error: "NO_ACTIVE_ORG" }, { status: 403 });
    }

    const { id: conversationId } = await params;
    const url = new URL(req.url);
    const beforeId = url.searchParams.get("before") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? PAGE_SIZE), 50);

    // Verify caller is a participant of this conversation
    const conv = await prisma.directConversation.findFirst({
        where: {
            id: conversationId,
            OR: [{ orgAId: activeOrgId }, { orgBId: activeOrgId }],
        },
        select: { id: true },
    });

    if (!conv) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Cursor: find the createdAt of the 'before' message
    let cursorWhere = {};
    if (beforeId) {
        const cursorMsg = await prisma.directMessage.findUnique({
            where: { id: beforeId },
            select: { createdAt: true },
        });
        if (cursorMsg) {
            cursorWhere = { createdAt: { lt: cursorMsg.createdAt } };
        }
    }

    const messages = await prisma.directMessage.findMany({
        where: {
            conversationId,
            ...cursorWhere,
        },
        include: {
            senderOrg: { select: { id: true, name: true, logo: true } },
            senderUser: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    // Return oldest-first so the UI can append naturally
    return NextResponse.json(messages.reverse());
}
