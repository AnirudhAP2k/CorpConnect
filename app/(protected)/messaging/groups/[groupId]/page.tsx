import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GroupChatWindow } from "@/components/messaging/GroupChatWindow";
import { leaveGroupAction } from "@/domain/messaging";

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function getGroupWithMessages(groupId: string, userId: string) {
    // Fetch group details + members
    const group = await prisma.groupConversation.findUnique({
        where: { id: groupId },
        include: {
            members: {
                include: {
                    user: { select: { id: true, name: true, image: true, email: true } },
                    organization: { select: { id: true, name: true, logo: true } },
                },
            },
        },
    });

    if (!group) return null;

    // Verify the caller is a member
    const membership = group.members.find((m) => m.userId === userId);
    if (!membership) return null;

    // Fetch initial messages (latest 30, then we paginate older via client)
    const messages = await prisma.groupMessage.findMany({
        where: { groupId },
        orderBy: { createdAt: "asc" },
        take: -30, // Prisma: negative take = last N rows
        include: {
            senderUser: { select: { id: true, name: true, image: true } },
            senderOrg: { select: { id: true, name: true, logo: true } },
        },
    });

    return { group, membership, messages };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GroupChatPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { groupId } = await params;

    const data = await getGroupWithMessages(groupId, session.user.id);
    if (!data) notFound();

    const { group, membership, messages } = data;

    // Serialize for client components
    const serializedMessages = messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
    }));

    const serializedMembers = group.members.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
    }));

    async function handleLeave() {
        "use server";
        const result = await leaveGroupAction(groupId);
        if ("success" in result) {
            redirect("/messaging");
        }
    }

    return (
        <GroupChatWindow
            groupId={group.id}
            groupName={group.name}
            groupDescription={group.description}
            members={serializedMembers}
            currentUserId={session.user!.id!}
            currentUserRole={membership.role}
            initialMessages={serializedMessages}
            onLeaveGroup={handleLeave}
        />
    );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    const group = await prisma.groupConversation.findUnique({
        where: { id: groupId },
        select: { name: true },
    });
    return {
        title: group ? `${group.name} — CorpConnect Groups` : "Group Chat — CorpConnect",
    };
}
