import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// ─── GET /api/messaging/conversations ─────────────────────────────────────────
// Returns all conversations for the active org, each including:
//   - the other org's profile (id, name, logo)
//   - the last message content + timestamp
//   - unread count (messages from the other org that are not READ)
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) {
        return NextResponse.json({ error: "NO_ACTIVE_ORG" }, { status: 403 });
    }

    const conversations = await prisma.directConversation.findMany({
        where: {
            OR: [{ orgAId: activeOrgId }, { orgBId: activeOrgId }],
        },
        include: {
            orgA: { select: { id: true, name: true, logo: true, isVerified: true } },
            orgB: { select: { id: true, name: true, logo: true, isVerified: true } },
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true, createdAt: true, senderOrgId: true },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    // For each conversation, compute unread count (messages sent by the OTHER org)
    const withUnread = await Promise.all(
        conversations.map(async (conv) => {
            const otherOrg = conv.orgAId === activeOrgId ? conv.orgB : conv.orgA;
            const unreadCount = await prisma.directMessage.count({
                where: {
                    conversationId: conv.id,
                    senderOrgId: { not: activeOrgId },
                    status: { not: "READ" },
                },
            });

            return {
                id: conv.id,
                otherOrg,
                lastMessage: conv.messages[0] ?? null,
                unreadCount,
                updatedAt: conv.updatedAt,
            };
        })
    );

    return NextResponse.json(withUnread);
}

// ─── POST /api/messaging/conversations ────────────────────────────────────────
// Creates or retrieves the conversation thread between the active org and a
// target org. Requires an ACCEPTED connection between the two orgs.
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) {
        return NextResponse.json({ error: "NO_ACTIVE_ORG" }, { status: 403 });
    }

    // Only OWNER / ADMIN can initiate a new conversation thread
    const membership = await prisma.organizationMember.findUnique({
        where: {
            userId_organizationId: {
                userId: session.user.id,
                organizationId: activeOrgId,
            },
        },
    });
    if (!membership || membership.role === "MEMBER") {
        return NextResponse.json({ error: "INSUFFICIENT_ROLE" }, { status: 403 });
    }

    const body = await req.json() as { targetOrgId?: string };
    const { targetOrgId } = body;

    if (!targetOrgId || targetOrgId === activeOrgId) {
        return NextResponse.json({ error: "INVALID_TARGET" }, { status: 400 });
    }

    // Verify an accepted connection exists between the two orgs
    const connection = await prisma.orgConnection.findFirst({
        where: {
            OR: [
                { sourceOrgId: activeOrgId, targetOrgId, status: "ACCEPTED" },
                { sourceOrgId: targetOrgId, targetOrgId: activeOrgId, status: "ACCEPTED" },
            ],
        },
    });
    if (!connection) {
        return NextResponse.json(
            { error: "NOT_CONNECTED", message: "You can only message organizations you are connected with." },
            { status: 403 }
        );
    }

    // Canonical ordering: smaller UUID first, enforcing the @@unique constraint
    const [orgAId, orgBId] = [activeOrgId, targetOrgId].sort();

    const conversation = await prisma.directConversation.upsert({
        where: { orgAId_orgBId: { orgAId, orgBId } },
        create: { orgAId, orgBId },
        update: {},
        select: { id: true },
    });

    return NextResponse.json({ conversationId: conversation.id });
}
