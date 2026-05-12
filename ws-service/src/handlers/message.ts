import type { Server, Socket } from "socket.io";
import { pool } from "@/db";
import { conversationRoom, orgNotificationRoom } from "@/rooms";

interface SendMessagePayload {
    conversationId: string;
    content: string;
}

interface DirectMessageRow {
    id: string;
    conversationId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    status: string;
    createdAt: Date;
}

export function registerMessageHandlers(io: Server, socket: Socket): void {
    const { userId, activeOrgId } = socket.data as { userId: string; activeOrgId: string };

    // ── join_conversation ───────────────────────────────────────────────────────
    // Client emits this when a chat window is opened. The socket joins the room
    // so it receives new_message events for this conversation.
    socket.on("join_conversation", async (conversationId: string) => {
        // Security: verify the caller belongs to this conversation before joining
        const result = await pool.query<{ id: string }>(
            `SELECT id FROM "DirectConversation"
             WHERE id = $1 AND ("orgAId" = $2 OR "orgBId" = $2)`,
            [conversationId, activeOrgId]
        );

        if (!result.rows.length) {
            socket.emit("error", { code: "FORBIDDEN", message: "You are not a participant of this conversation" });
            return;
        }

        socket.join(conversationRoom(conversationId));
        console.log(`[ws] socket ${socket.id} joined conv:${conversationId}`);
    });

    // ── send_message ────────────────────────────────────────────────────────────
    socket.on("send_message", async (payload: SendMessagePayload, ack?: (res: unknown) => void) => {
        const { conversationId, content } = payload;

        if (!content?.trim()) {
            ack?.({ error: "EMPTY_MESSAGE" });
            return;
        }

        if (content.length > 4000) {
            ack?.({ error: "MESSAGE_TOO_LONG" });
            return;
        }

        // 1. Verify caller is a participant
        const convResult = await pool.query<{ id: string; orgAId: string; orgBId: string }>(
            `SELECT id, "orgAId", "orgBId" FROM "DirectConversation"
             WHERE id = $1 AND ("orgAId" = $2 OR "orgBId" = $2)`,
            [conversationId, activeOrgId]
        );

        if (!convResult.rows.length) {
            ack?.({ error: "FORBIDDEN" });
            return;
        }

        const conv = convResult.rows[0];
        const receiverOrgId = conv.orgAId === activeOrgId ? conv.orgBId : conv.orgAId;

        // 2. Persist message
        const msgResult = await pool.query<DirectMessageRow>(
            `INSERT INTO "DirectMessage"
               (id, "conversationId", "senderOrgId", "senderUserId", content, status, "createdAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'SENT', NOW())
             RETURNING id, "conversationId", "senderOrgId", "senderUserId", content, status, "createdAt"`,
            [conversationId, activeOrgId, userId, content.trim()]
        );

        const newMsg = msgResult.rows[0];

        // 3. Update conversation updatedAt so list ordering stays fresh
        await pool.query(
            `UPDATE "DirectConversation" SET "updatedAt" = NOW() WHERE id = $1`,
            [conversationId]
        );

        // 4. Broadcast to everyone in the conversation room (both sides)
        io.to(conversationRoom(conversationId)).emit("new_message", {
            ...newMsg,
            createdAt: newMsg.createdAt.toISOString(),
        });

        // 5. Notify the receiver's org room (for unread badge, even if not in chat room)
        io.to(orgNotificationRoom(receiverOrgId)).emit("message_notification", {
            conversationId,
            senderOrgId: activeOrgId,
        });

        ack?.({ ok: true, messageId: newMsg.id });
        console.log(`[ws] message ${newMsg.id} sent in conv:${conversationId}`);
    });

    // ── mark_read ───────────────────────────────────────────────────────────────
    // Marks all messages from the OTHER org as READ for the calling org.
    socket.on("mark_read", async (conversationId: string) => {
        // Verify participation
        const check = await pool.query(
            `SELECT id FROM "DirectConversation"
             WHERE id = $1 AND ("orgAId" = $2 OR "orgBId" = $2)`,
            [conversationId, activeOrgId]
        );
        if (!check.rows.length) return;

        await pool.query(
            `UPDATE "DirectMessage"
             SET status = 'READ', "readAt" = NOW()
             WHERE "conversationId" = $1
               AND "senderOrgId" != $2
               AND status != 'READ'`,
            [conversationId, activeOrgId]
        );

        // Notify both sides so sender sees the read receipt tick
        io.to(conversationRoom(conversationId)).emit("messages_read", {
            conversationId,
            byOrgId: activeOrgId,
        });
    });

    // ── leave_conversation ──────────────────────────────────────────────────────
    socket.on("leave_conversation", (conversationId: string) => {
        socket.leave(conversationRoom(conversationId));
    });
}
