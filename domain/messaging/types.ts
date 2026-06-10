import { GroupInviteStatus, GroupMemberRole } from "@prisma/client";

// ─── Group Conversation ───────────────────────────────────────────────────────

export interface GroupConversation {
    id: string;
    name: string;
    description: string | null;
    creatorOrgId: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface GroupMember {
    id: string;
    groupId: string;
    orgId: string;
    userId: string;
    role: GroupMemberRole;
    joinedAt: Date;
    lastReadMessageId: string | null;
    // Nested
    user?: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
    };
    organization?: {
        id: string;
        name: string;
        logo: string | null;
    };
}

export interface GroupMessage {
    id: string;
    groupId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    createdAt: Date;
    // Nested
    senderUser?: {
        id: string;
        name: string | null;
        image: string | null;
    };
    senderOrg?: {
        id: string;
        name: string;
        logo: string | null;
    };
}

export interface GroupInvite {
    id: string;
    groupId: string;
    inviterOrgId: string;
    inviterUserId: string;
    inviteeOrgId: string;
    inviteeUserId: string;
    status: GroupInviteStatus;
    createdAt: Date;
    updatedAt: Date;
    // Nested
    group?: {
        id: string;
        name: string;
    };
    inviterOrg?: {
        id: string;
        name: string;
        logo: string | null;
    };
    inviterUser?: {
        id: string;
        name: string | null;
        image: string | null;
    };
}

// ─── Composite views ──────────────────────────────────────────────────────────

export interface GroupConversationListItem extends GroupConversation {
    memberCount: number;
    lastMessage: Pick<GroupMessage, "content" | "createdAt" | "senderUserId"> | null;
    unreadCount: number;
    members: Pick<GroupMember, "id" | "userId" | "orgId" | "role" | "user" | "organization">[];
}
