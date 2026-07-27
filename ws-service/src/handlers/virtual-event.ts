import { Server, Socket } from "socket.io";
import { pool } from "@/db";

export const virtualRoomPresence = (roomId: string) => `vroom:${roomId}`;

/**
 * Verifies the user may access the given virtual room: they must be a registered
 * (non-cancelled) participant of the room's event, or an OWNER/ADMIN of the
 * hosting organization. Queried from the DB to prevent token/room-id spoofing.
 */
async function assertVirtualRoomAccess(roomId: string, userId: string): Promise<boolean> {
    const result = await pool.query<{ ok: boolean }>(
        `SELECT EXISTS (
             SELECT 1
             FROM "VirtualRoom" vr
             JOIN "Events" e ON e.id = vr."eventId"
             LEFT JOIN "EventParticipation" ep
                    ON ep."eventId" = e.id
                   AND ep."userId" = $2
                   AND ep.status NOT IN ('CANCELLED', 'WAITLISTED')
             LEFT JOIN "OrganizationMember" om
                    ON om."organizationId" = e."organizationId"
                   AND om."userId" = $2
                   AND om.role IN ('OWNER', 'ADMIN')
             WHERE vr.id = $1
               AND (ep.id IS NOT NULL OR om.id IS NOT NULL)
         ) AS ok`,
        [roomId, userId]
    );
    return result.rows[0]?.ok === true;
}

export function registerVirtualEventHandlers(io: Server, socket: Socket, userId: string, activeOrgId: string) {
    // Only rooms the socket has been authorized into may receive events from it.
    const authorizedRooms = new Set<string>();

    // ─── Join/Leave Presence Room ────────────────────────────────────────────────
    socket.on("join_virtual_room", async (roomId: string) => {
        if (!roomId) return;
        try {
            const allowed = await assertVirtualRoomAccess(roomId, userId);
            if (!allowed) {
                socket.emit("error", {
                    code: "ROOM_ACCESS_DENIED",
                    message: "You are not authorized to join this room.",
                });
                return;
            }
            authorizedRooms.add(roomId);
            socket.join(virtualRoomPresence(roomId));
            console.log(`[ws] User ${userId} joined virtual room presence: ${roomId}`);
        } catch (err) {
            console.error("[ws] join_virtual_room error:", err);
            socket.emit("error", { code: "SERVER_ERROR", message: "Failed to join room." });
        }
    });

    socket.on("leave_virtual_room", (roomId: string) => {
        if (!roomId) return;
        authorizedRooms.delete(roomId);
        socket.leave(virtualRoomPresence(roomId));
        console.log(`[ws] User ${userId} left virtual room presence: ${roomId}`);
    });

    // ─── Reactions (Emojis) ──────────────────────────────────────────────────────
    socket.on("react", (roomId: string, emoji: string) => {
        if (!roomId || !emoji || !authorizedRooms.has(roomId)) return;
        io.to(virtualRoomPresence(roomId)).emit("reaction_received", {
            userId,
            activeOrgId,
            emoji,
            timestamp: new Date().toISOString(),
        });
    });

    // ─── Q&A / Hand Raising ──────────────────────────────────────────────────────
    socket.on("raise_hand", (roomId: string) => {
        if (!roomId || !authorizedRooms.has(roomId)) return;
        io.to(virtualRoomPresence(roomId)).emit("hand_raised", {
            userId,
            activeOrgId,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on("lower_hand", (roomId: string) => {
        if (!roomId || !authorizedRooms.has(roomId)) return;
        io.to(virtualRoomPresence(roomId)).emit("hand_lowered", {
            userId,
            activeOrgId,
        });
    });

    // ─── Polls (Future enhancement stub) ─────────────────────────────────────────
    socket.on("poll_vote", async (roomId: string, pollId: string, optionId: string) => {
        if (!roomId || !pollId || !optionId || !authorizedRooms.has(roomId)) return;
        // In a real app, you'd insert the vote into the DB here, then broadcast the new counts
        io.to(virtualRoomPresence(roomId)).emit("poll_updated", {
            pollId,
            optionId,
            userId,
        });
    });
}
