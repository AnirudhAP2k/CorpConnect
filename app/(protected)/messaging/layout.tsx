import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ConversationList } from "@/components/messaging/ConversationList";
import { GroupConversationList } from "@/components/messaging/GroupConversationList";
import { Suspense } from "react";
import { ConversationListSkeleton } from "@/components/messaging/MessagingSkeletons";
import { Zap } from "lucide-react";

// ─── Data Fetchers ────────────────────────────────────────────────────────────

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
                    ? { ...conv.messages[0], createdAt: conv.messages[0].createdAt.toISOString() }
                    : null,
                unreadCount,
                updatedAt: conv.updatedAt.toISOString(),
            };
        })
    );

    return withUnread;
}

async function getGroupsForSidebar(userId: string) {
    const memberships = await prisma.groupMember.findMany({
        where: { userId },
        include: {
            group: {
                include: {
                    members: {
                        include: {
                            organization: { select: { id: true, name: true, logo: true } },
                        },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { content: true, createdAt: true, senderUserId: true },
                    },
                },
            },
        },
        orderBy: { joinedAt: "desc" },
    });

    return memberships.map(({ group, userId: memberUserId, role, lastReadMessageId }) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        creatorOrgId: group.creatorOrgId,
        createdById: group.createdById,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        memberCount: group.members.length,
        lastMessage: group.messages[0]
            ? { ...group.messages[0], createdAt: group.messages[0].createdAt.toISOString() }
            : null,
        unreadCount: 0, // computed client-side from lastReadMessageId
        members: group.members.map((m) => ({
            id: m.id,
            userId: m.userId,
            orgId: m.orgId,
            role: m.role,
            organization: m.organization,
        })),
    }));
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function MessagingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const activeOrgId = session.user.activeOrganizationId;
    if (!activeOrgId) redirect("/dashboard");

    // Fetch active org plan to show/hide Enterprise Groups section
    const activeOrg = await prisma.organization.findUnique({
        where: { id: activeOrgId },
        select: { subscriptionPlan: true },
    });
    const isEnterprise = activeOrg?.subscriptionPlan === "ENTERPRISE";

    // Parallel data fetch
    const [conversations, groups] = await Promise.all([
        getConversations(activeOrgId),
        isEnterprise ? getGroupsForSidebar(session.user.id) : Promise.resolve([]),
    ]);

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left panel: conversation list ── */}
            <aside className="w-72 shrink-0 border-r border-nx-outline-variant overflow-hidden hidden md:flex flex-col bg-[#f8f7f8]">
                {/* Direct messages section */}
                <div className={isEnterprise ? "flex-shrink-0 overflow-y-auto max-h-[55%]" : "flex-1 overflow-hidden"}>
                    <Suspense fallback={<ConversationListSkeleton />}>
                        <ConversationList
                            conversations={conversations}
                            activeOrgId={activeOrgId}
                        />
                    </Suspense>
                </div>

                {/* Divider + Enterprise Groups section */}
                {isEnterprise ? (
                    <div className="flex-1 border-t border-nx-outline-variant/60 overflow-hidden flex flex-col">
                        <GroupConversationList
                            groups={groups}
                            currentUserId={session.user.id}
                        />
                    </div>
                ) : (
                    /* Non-enterprise subtle upgrade prompt */
                    <div className="mx-3 mb-3 mt-auto shrink-0">
                        <div className="rounded-xl border border-nx-outline-variant/60 bg-white px-3 py-3 text-center">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                            </div>
                            <p className="text-[11px] font-semibold text-nx-on-surface">Enterprise Groups</p>
                            <p className="text-[10px] text-nx-on-surface-variant mt-0.5 leading-relaxed">
                                Upgrade to Enterprise to create multi-org group chats.
                            </p>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Right panel: chat area ── */}
            <main className="flex-1 overflow-hidden flex flex-col">
                {children}
            </main>
        </div>
    );
}
