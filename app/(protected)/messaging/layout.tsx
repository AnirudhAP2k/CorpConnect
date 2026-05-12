import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ConversationList } from "@/components/messaging/ConversationList";
import { Suspense } from "react";
import { ConversationListSkeleton } from "@/components/messaging/MessagingSkeletons";

// Fetch conversations on the server for SSR
async function getConversations(activeOrgId: string) {
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

    // Compute unread counts in parallel
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
                lastMessage: conv.messages[0]
                    ? {
                          ...conv.messages[0],
                          createdAt: conv.messages[0].createdAt.toISOString(),
                      }
                    : null,
                unreadCount,
                updatedAt: conv.updatedAt.toISOString(),
            };
        })
    );

    return withUnread;
}

export default async function MessagingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) redirect("/dashboard");

    const conversations = await getConversations(activeOrgId);

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left panel: conversation list ── */}
            <aside className="w-72 shrink-0 border-r border-nx-outline-variant overflow-hidden hidden md:block">
                <Suspense fallback={<ConversationListSkeleton />}>
                    <ConversationList
                        conversations={conversations}
                        activeOrgId={activeOrgId}
                    />
                </Suspense>
            </aside>

            {/* ── Right panel: chat area ── */}
            <main className="flex-1 overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
