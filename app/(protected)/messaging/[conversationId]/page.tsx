import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import {
    getDirectConversationForOrg,
    getDirectMessages,
    markConversationReadAction,
} from "@/domain/messaging";
import { ChatWindow } from "@/components/messaging/ChatWindow";
import type { DirectMessage } from "@/hooks/useConversation";

interface ChatPageProps {
    params: Promise<{ conversationId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
    const { conversationId } = await params;
    const session = await auth();

    if (!session?.user?.id) redirect("/login");

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) redirect("/dashboard");

    // Verify the caller is a participant in this conversation
    const conversation = await getDirectConversationForOrg(conversationId, activeOrgId);

    if (!conversation) notFound();

    // Determine the other org
    const otherOrg =
        conversation.orgAId === activeOrgId ? conversation.orgB : conversation.orgA;

    // SSR: load last 30 messages (oldest-first for display)
    const rawMessages = await getDirectMessages(conversationId);

    // Mark unread messages from the other org as READ on open
    await markConversationReadAction(conversationId);

    const initialMessages: DirectMessage[] = rawMessages
        .map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            senderOrgId: m.senderOrgId,
            senderUserId: m.senderUserId,
            content: m.content,
            status: m.status as "SENT" | "DELIVERED" | "READ",
            createdAt: m.createdAt.toISOString(),
            senderOrg: m.senderOrg
                ? { id: m.senderOrg.id, name: m.senderOrg.name, logo: m.senderOrg.logo }
                : undefined,
            senderUser: m.senderUser
                ? {
                      id: m.senderUser.id,
                      name: m.senderUser.name,
                      image: m.senderUser.image,
                  }
                : undefined,
        }));

    return (
        <ChatWindow
            conversationId={conversationId}
            activeOrgId={activeOrgId}
            otherOrg={otherOrg}
            initialMessages={initialMessages}
        />
    );
}
