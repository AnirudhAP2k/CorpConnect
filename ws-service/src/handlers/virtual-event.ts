import { Server, Socket } from "socket.io";
import { pool } from "@/db";

export const virtualRoomPresence = (roomId: string) => `vroom:${roomId}`;

export function registerVirtualEventHandlers(io: Server, socket: Socket, userId: string, activeOrgId: string) {
    // ─── Join/Leave Presence Room ────────────────────────────────────────────────
    socket.on("join_virtual_room", async (roomId: string) => {
        if (!roomId) return;
        socket.join(virtualRoomPresence(roomId));
        console.log(`[ws] User ${userId} joined virtual room presence: ${roomId}`);
    });

    socket.on("leave_virtual_room", (roomId: string) => {
        if (!roomId) return;
        socket.leave(virtualRoomPresence(roomId));
        console.log(`[ws] User ${userId} left virtual room presence: ${roomId}`);
    });

    // ─── Reactions (Emojis) ──────────────────────────────────────────────────────
    socket.on("react", (roomId: string, emoji: string) => {
        if (!roomId || !emoji) return;
        io.to(virtualRoomPresence(roomId)).emit("reaction_received", {
            userId,
            activeOrgId,
            emoji,
            timestamp: new Date().toISOString(),
        });
    });

    // ─── Q&A / Hand Raising ──────────────────────────────────────────────────────
    socket.on("raise_hand", (roomId: string) => {
        if (!roomId) return;
        io.to(virtualRoomPresence(roomId)).emit("hand_raised", {
            userId,
            activeOrgId,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on("lower_hand", (roomId: string) => {
        if (!roomId) return;
        io.to(virtualRoomPresence(roomId)).emit("hand_lowered", {
            userId,
            activeOrgId,
        });
    });

    // ─── Polls (Future enhancement stub) ─────────────────────────────────────────
    socket.on("poll_vote", async (roomId: string, pollId: string, optionId: string) => {
        if (!roomId || !pollId || !optionId) return;
        // In a real app, you'd insert the vote into the DB here, then broadcast the new counts
        io.to(virtualRoomPresence(roomId)).emit("poll_updated", {
            pollId,
            optionId,
            userId,
        });
    });
}
