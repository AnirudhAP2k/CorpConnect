import type { Server, Socket } from "socket.io";
import { pool } from "@/db";
import { groupRoom, orgNotificationRoom } from "@/rooms";

// ─── Payload Types ────────────────────────────────────────────────────────────

interface JoinGroupPayload {
    groupId: string;
}

interface SendGroupMessagePayload {
    groupId: string;
    content: string;
}

interface GroupTypingPayload {
    groupId: string;
    typing: boolean;
}

interface GroupMessageRow {
    id: string;
    groupId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    createdAt: Date;
}

// ─── Enterprise Gate ──────────────────────────────────────────────────────────

/**
 * Verifies the calling org has an ENTERPRISE subscription.
 * Queried directly from DB to prevent token-spoofing.
 */
async function assertEnterpriseOrg(orgId: string): Promise<boolean> {
    const result = await pool.query<{ subscriptionPlan: string }>(
        `SELECT "subscriptionPlan" FROM "Organization" WHERE id = $1`,
        [orgId]
    );
    return result.rows[0]?.subscriptionPlan === "ENTERPRISE";
}

/**
 * Verifies the user is a member of the specified group AND their org is ENTERPRISE.
 */
async function assertGroupMembership(
    groupId: string,
    userId: string,
    orgId: string
): Promise<boolean> {
    const [memberCheck, enterpriseCheck] = await Promise.all([
        pool.query<{ id: string }>(
            `SELECT id FROM "GroupMember"
             WHERE "groupId" = $1 AND "userId" = $2`,
            [groupId, userId]
        ),
        assertEnterpriseOrg(orgId),
    ]);
    return memberCheck.rows.length > 0 && enterpriseCheck;
}

// ─── Handler Registration ─────────────────────────────────────────────────────

export function registerGroupMessageHandlers(io: Server, socket: Socket): void {
    const { userId, activeOrgId } = socket.data as { userId: string; activeOrgId: string };

    // ── join_group ───────────────────────────────────────────────────────────────
    // Client emits this when a group chat window is opened. Validates membership
    // and ENTERPRISE subscription before joining the socket room.
    socket.on("join_group", async (payload: JoinGroupPayload) => {
        const { groupId } = payload;
        if (!groupId) return;

        const allowed = await assertGroupMembership(groupId, userId, activeOrgId);
        if (!allowed) {
            socket.emit("error", {
                code: "ENTERPRISE_REQUIRED",
                message: "Group messaging requires an Enterprise subscription.",
            });
            return;
        }

        socket.join(groupRoom(groupId));
        console.log(`[ws] socket ${socket.id} joined group:${groupId}`);
    });

    // ── send_group_message ───────────────────────────────────────────────────────
    // Persists the message and broadcasts it to everyone in the group room.
    socket.on("send_group_message", async (
        payload: SendGroupMessagePayload,
        ack?: (res: unknown) => void
    ) => {
        const { groupId, content } = payload;

        // Input validation
        if (!content?.trim()) {
            ack?.({ error: "EMPTY_MESSAGE" });
            return;
        }
        if (content.length > 4000) {
            ack?.({ error: "MESSAGE_TOO_LONG" });
            return;
        }

        // Re-verify membership + Enterprise gate on every send (security critical)
        const allowed = await assertGroupMembership(groupId, userId, activeOrgId);
        if (!allowed) {
            ack?.({ error: "FORBIDDEN" });
            return;
        }

        try {
            // 1. Persist the message
            const msgResult = await pool.query<GroupMessageRow>(
                `INSERT INTO "GroupMessage"
                   (id, "groupId", "senderOrgId", "senderUserId", content, "createdAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
                 RETURNING id, "groupId", "senderOrgId", "senderUserId", content, "createdAt"`,
                [groupId, activeOrgId, userId, content.trim()]
            );

            const newMsg = msgResult.rows[0];

            // 2. Update group's updatedAt for list ordering
            await pool.query(
                `UPDATE "GroupConversation" SET "updatedAt" = NOW() WHERE id = $1`,
                [groupId]
            );

            // 3. Broadcast to everyone in the group room
            io.to(groupRoom(groupId)).emit("new_group_message", {
                ...newMsg,
                createdAt: newMsg.createdAt.toISOString(),
            });

            // 4. Notify each member org's notification room (unread badge support).
            // Fetch distinct orgIds of members who are NOT the sender.
            const memberOrgsResult = await pool.query<{ orgId: string }>(
                `SELECT DISTINCT "orgId" FROM "GroupMember"
                 WHERE "groupId" = $1 AND "userId" != $2`,
                [groupId, userId]
            );
            for (const { orgId } of memberOrgsResult.rows) {
                io.to(orgNotificationRoom(orgId)).emit("group_message_notification", {
                    groupId,
                    senderOrgId: activeOrgId,
                });
            }

            ack?.({ ok: true, messageId: newMsg.id });
            console.log(`[ws] group message ${newMsg.id} sent in group:${groupId}`);
        } catch (err) {
            console.error("[ws] send_group_message error:", err);
            ack?.({ error: "SERVER_ERROR" });
        }
    });

    // ── mark_group_read ──────────────────────────────────────────────────────────
    // Updates the member's lastReadMessageId to the latest message in the group.
    socket.on("mark_group_read", async (groupId: string) => {
        if (!groupId) return;

        const isMember = await assertGroupMembership(groupId, userId, activeOrgId);
        if (!isMember) return;

        try {
            // Get the latest message id in the group
            const latestResult = await pool.query<{ id: string }>(
                `SELECT id FROM "GroupMessage"
                 WHERE "groupId" = $1
                 ORDER BY "createdAt" DESC LIMIT 1`,
                [groupId]
            );

            if (!latestResult.rows.length) return;

            const latestMessageId = latestResult.rows[0].id;

            // Update the member's read cursor
            await pool.query(
                `UPDATE "GroupMember"
                 SET "lastReadMessageId" = $1
                 WHERE "groupId" = $2 AND "userId" = $3`,
                [latestMessageId, groupId, userId]
            );

            // Emit read receipt back to the room so other clients can update UI
            io.to(groupRoom(groupId)).emit("group_messages_read", {
                groupId,
                byUserId: userId,
                byOrgId: activeOrgId,
                lastReadMessageId: latestMessageId,
            });
        } catch (err) {
            console.error("[ws] mark_group_read error:", err);
        }
    });

    // ── group_typing ─────────────────────────────────────────────────────────────
    // Ephemeral: broadcast typing indicator without DB persistence.
    socket.on("group_typing", async (payload: GroupTypingPayload) => {
        const { groupId, typing } = payload;
        if (!groupId) return;

        // Lightweight membership check (no enterprise re-check needed — already joined)
        const isMember = await pool.query<{ id: string }>(
            `SELECT id FROM "GroupMember" WHERE "groupId" = $1 AND "userId" = $2`,
            [groupId, userId]
        );
        if (!isMember.rows.length) return;

        socket.to(groupRoom(groupId)).emit("group_typing", {
            groupId,
            userId,
            orgId: activeOrgId,
            typing,
        });
    });

    // ── leave_group ──────────────────────────────────────────────────────────────
    // Client emits this when closing a group chat window (UI cleanup only — does
    // NOT remove the user from GroupMember table).
    socket.on("leave_group", (groupId: string) => {
        socket.leave(groupRoom(groupId));
        console.log(`[ws] socket ${socket.id} left group:${groupId}`);
    });
}
