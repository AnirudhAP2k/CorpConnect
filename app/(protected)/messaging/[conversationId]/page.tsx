import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
    const conversation = await prisma.directConversation.findFirst({
        where: {
            id: conversationId,
            OR: [{ orgAId: activeOrgId }, { orgBId: activeOrgId }],
        },
        include: {
            orgA: { select: { id: true, name: true, logo: true, isVerified: true } },
            orgB: { select: { id: true, name: true, logo: true, isVerified: true } },
        },
    });

    if (!conversation) notFound();

    // Determine the other org
    const otherOrg =
        conversation.orgAId === activeOrgId ? conversation.orgB : conversation.orgA;

    // SSR: load last 30 messages (oldest-first for display)
    const rawMessages = await prisma.directMessage.findMany({
        where: { conversationId },
        include: {
            senderOrg: { select: { id: true, name: true, logo: true } },
            senderUser: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
    });

    // Mark unread messages from the other org as READ on open
    await prisma.directMessage.updateMany({
        where: {
            conversationId,
            senderOrgId: { not: activeOrgId },
            status: { not: "READ" },
        },
        data: { status: "READ", readAt: new Date() },
    });

    // Serialize dates and reverse so oldest is first
    const initialMessages: DirectMessage[] = rawMessages
        .reverse()
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
