import { Router, Request, Response } from "express";
import { pool } from "@/db";
import { generateRoomToken } from "@/livekit";

const router = Router();

interface TokenRequestBody {
    roomId: string;
}

/**
 * POST /token
 * Body: { roomId: string }
 *
 * Access gates (all must pass):
 *  1. Room exists and is active
 *  2. Caller has a valid, non-cancelled EventParticipation  OR  is a host org OWNER/ADMIN
 *  3. Current time is within the event window (±15 min grace period at start)
 *
 * Returns: { token: string, livekitUrl: string }
 */
router.post("/", async (req: Request, res: Response) => {
    const { roomId } = req.body as TokenRequestBody;
    const { userId, activeOrgId } = req.auth!;

    if (!roomId) {
        return res.status(400).json({ error: "MISSING_ROOM_ID" });
    }

    try {
        // ── 1. Fetch room ──────────────────────────────────────────────────────
        const roomResult = await pool.query<{
            id: string;
            livekitRoom: string;
            eventId: string;
            isActive: boolean;
        }>(
            `SELECT id, "livekitRoom", "eventId", "isActive"
             FROM "VirtualRoom"
             WHERE id = $1`,
            [roomId]
        );

        if (!roomResult.rows.length) {
            return res.status(404).json({ error: "ROOM_NOT_FOUND" });
        }

        const room = roomResult.rows[0];

        if (!room.isActive) {
            return res.status(403).json({ error: "ROOM_CLOSED" });
        }

        // ── 2. Check event time window ─────────────────────────────────────────
        const eventResult = await pool.query<{
            startDateTime: Date;
            endDateTime: Date;
            title: string;
            isFree: boolean;
            eventType: string;
        }>(
            `SELECT "startDateTime", "endDateTime", title, "isFree", "eventType"
             FROM "Events"
             WHERE id = $1`,
            [room.eventId]
        );

        if (!eventResult.rows.length) {
            return res.status(404).json({ error: "EVENT_NOT_FOUND" });
        }

        const event = eventResult.rows[0];
        const now = new Date();
        // Allow joining 15 minutes before the event starts
        const joinFrom = new Date(event.startDateTime.getTime() - 15 * 60 * 1000);

        if (now < joinFrom) {
            return res.status(403).json({
                error: "EVENT_NOT_STARTED",
                startsAt: event.startDateTime.toISOString(),
            });
        }

        if (now > event.endDateTime) {
            return res.status(403).json({
                error: "EVENT_ENDED",
                endedAt: event.endDateTime.toISOString(),
            });
        }

        // ── 3. Check participant OR host access ────────────────────────────────
        const [partResult, hostResult] = await Promise.all([
            // Registered participant (non-cancelled, payment satisfied)
            pool.query<{ status: string; isPaid: boolean }>(
                `SELECT status, "isPaid"
                 FROM "EventParticipation"
                 WHERE "eventId" = $1
                   AND "userId" = $2
                   AND status NOT IN ('CANCELLED', 'WAITLISTED')`,
                [room.eventId, userId]
            ),
            // Host org OWNER or ADMIN
            pool.query<{ role: string }>(
                `SELECT om.role
                 FROM "OrganizationMember" om
                 JOIN "Events" e ON e."organizationId" = om."organizationId"
                 WHERE e.id = $1
                   AND om."userId" = $2
                   AND om.role IN ('OWNER', 'ADMIN')`,
                [room.eventId, userId]
            ),
        ]);

        const participation = partResult.rows[0];
        const isHost = hostResult.rows.length > 0;
        const isParticipant = partResult.rows.length > 0;

        if (!isParticipant && !isHost) {
            return res.status(403).json({ error: "NOT_REGISTERED" });
        }

        // For paid events: non-hosts must have paid
        if (isParticipant && !isHost && !event.isFree && !participation.isPaid) {
            return res.status(403).json({ error: "PAYMENT_REQUIRED" });
        }

        // ── 4. Generate LiveKit token ──────────────────────────────────────────
        // Hosts can always publish; participants can publish by default (for interactivity)
        // View-only logic can be added per event config in the future
        const token = await generateRoomToken({
            roomName: room.livekitRoom,
            participantIdentity: userId,
            participantName: `user:${userId}`,
            canPublish: true,
            canSubscribe: true,
        });

        // ── 5. Log session start ───────────────────────────────────────────────
        await pool.query(
            `INSERT INTO "VirtualSession" (id, "roomId", "userId", "organizationId", "joinedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             ON CONFLICT DO NOTHING`,
            [roomId, userId, activeOrgId || null]
        );

        return res.json({
            token,
            livekitUrl: process.env.LIVEKIT_URL,
            roomName: room.livekitRoom,
        });
    } catch (err) {
        console.error("[lv-service] POST /token error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

export default router;
