import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { GroupChatWindow } from "@/components/messaging/GroupChatWindow";
import { getGroupChatData, getGroupName, leaveGroupAction } from "@/domain/messaging";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function GroupChatPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { groupId } = await params;

    const data = await getGroupChatData(groupId, session.user.id);
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
    const name = await getGroupName(groupId);
    return {
        title: name ? `${name} — CorpConnect Groups` : "Group Chat — CorpConnect",
    };
}
