/**
 * Public API for the Enterprise Group Messaging domain.
 * Import from "@/domain/messaging" for all consumer code.
 */

// Types
export type {
    GroupConversation,
    GroupMember,
    GroupMessage,
    GroupInvite,
    GroupConversationListItem,
} from "./types";

// Read-only queries (safe for Server Components)
export {
    getGroupsForUser,
    getGroupMessages,
    getPendingGroupInvites,
    getGroupById,
    assertEnterpriseSubscription,
} from "./queries";

// Server Actions (authenticated mutations)
export {
    createGroupAction,
    inviteToGroupAction,
    acceptGroupInviteAction,
    rejectGroupInviteAction,
    leaveGroupAction,
} from "./actions";
