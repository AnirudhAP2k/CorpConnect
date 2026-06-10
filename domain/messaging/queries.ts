import { prisma } from "@/lib/db";
import { checkEnterprise } from "@/lib/enterprise";
import type { GroupConversationListItem } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Asserts that an organization is on the ENTERPRISE plan. Throws if not. */
export async function assertEnterpriseSubscription(orgId: string): Promise<void> {
    const result = await checkEnterprise(orgId);
    if (!result.ok) {
        throw new Error(result.reason ?? "Enterprise subscription required.");
    }
}

// ─── Group Queries ────────────────────────────────────────────────────────────

/**
 * Returns all group conversations for a user with last message and unread count.
 */
export async function getGroupsForUser(userId: string): Promise<GroupConversationListItem[]> {
    // Fetch all groups the user is a member of
    const memberships = await prisma.groupMember.findMany({
        where: { userId },
        include: {
            group: {
                include: {
                    members: {
                        include: {
                            user: { select: { id: true, name: true, image: true, email: true } },
                            organization: { select: { id: true, name: true, logo: true } },
                        },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: {
                            content: true,
                            createdAt: true,
                            senderUserId: true,
                        },
                    },
                },
            },
        },
    });

    return memberships.map((membership) => {
        const group = membership.group;
        const lastMessage = group.messages[0] ?? null;

        // Count messages newer than the user's last read cursor
        // Note: full unread count is computed client-side from `lastReadMessageId`.
        // Here we provide a conservative 0 if they haven't opened the group yet.
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            creatorOrgId: group.creatorOrgId,
            createdById: group.createdById,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            memberCount: group.members.length,
            lastMessage,
            unreadCount: 0, // populated by client via lastReadMessageId
            members: group.members,
        };
    });
}

/**
 * Returns paginated message history for a group, newest-first (cursor-based).
 */
export async function getGroupMessages(
    groupId: string,
    userId: string,
    options: { cursor?: string; limit?: number } = {}
) {
    const { cursor, limit = 30 } = options;

    // Security: verify caller is a member before fetching history
    const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new Error("You are not a member of this group.");

    const messages = await prisma.groupMessage.findMany({
        where: {
            groupId,
            ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            senderUser: { select: { id: true, name: true, image: true } },
            senderOrg: { select: { id: true, name: true, logo: true } },
        },
    });

    return {
        messages: messages.reverse(), // return chronological order
        nextCursor: messages.length === limit
            ? messages[0].createdAt.toISOString()
            : null,
    };
}

/**
 * Returns all pending group invitations for a user.
 */
export async function getPendingGroupInvites(userId: string) {
    return prisma.groupInvite.findMany({
        where: { inviteeUserId: userId, status: "PENDING" },
        include: {
            group: { select: { id: true, name: true } },
            inviterOrg: { select: { id: true, name: true, logo: true } },
            inviterUser: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Returns a single group with all members, verified the caller is a member.
 */
export async function getGroupById(groupId: string, requestingUserId: string) {
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

    if (!group) throw new Error("Group not found.");

    const isMember = group.members.some((m) => m.userId === requestingUserId);
    if (!isMember) throw new Error("You are not a member of this group.");

    return group;
}
