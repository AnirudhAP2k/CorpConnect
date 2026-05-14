/**
 * Deterministic room names used by Socket.io.
 * Using stable prefixes avoids accidental collisions between room types.
 */

/** Room for a specific conversation — both org sockets join this to exchange messages. */
export const conversationRoom = (conversationId: string): string =>
    `conv:${conversationId}`;

/** Per-org notification room — used to push unread badges without opening a chat. */
export const orgNotificationRoom = (orgId: string): string =>
    `org:${orgId}`;
