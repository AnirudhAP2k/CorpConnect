import { Router, Request, Response } from "express";
import cryptoJs from "crypto-js";
import { pool } from "@/db";
import { roomService } from "@/livekit";

const router = Router();

// ── GET /rooms?eventId= ─────────────────────────────────────────────────────
// List all active virtual rooms for an event.
// Available to any authenticated user (participant or host).
router.get("/", async (req: Request, res: Response) => {
    const { eventId } = req.query as { eventId?: string };

    if (!eventId) {
        return res.status(400).json({ error: "MISSING_EVENT_ID" });
    }

    try {
        const result = await pool.query<{
            id: string;
            name: string;
            livekitRoom: string;
            isActive: boolean;
            maxParticipants: number | null;
            createdAt: Date;
        }>(
            `SELECT id, name, "livekitRoom", "isActive", "maxParticipants", "createdAt"
             FROM "VirtualRoom"
             WHERE "eventId" = $1 AND "isActive" = true
             ORDER BY "createdAt" ASC`,
            [eventId]
        );

        return res.json({ rooms: result.rows });
    } catch (err) {
        console.error("[lv-service] GET /rooms error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// ── POST /rooms ─────────────────────────────────────────────────────────────
// Host creates a new virtual room for an event.
// Requires: OWNER or ADMIN role in the hosting organization.
router.post("/", async (req: Request, res: Response) => {
    const { eventId, name, maxParticipants } = req.body as {
        eventId: string;
        name: string;
        maxParticipants?: number;
    };
    const { userId, role } = req.auth!;

    if (!eventId || !name?.trim()) {
        return res.status(400).json({ error: "MISSING_FIELDS" });
    }

    // Only OWNER or ADMIN can create rooms
    if (!["OWNER", "ADMIN"].includes(role)) {
        return res.status(403).json({ error: "INSUFFICIENT_ROLE" });
    }

    try {
        // Verify this user's org actually hosts this event
        const hostCheck = await pool.query<{ id: string }>(
            `SELECT e.id
             FROM "Events" e
             JOIN "OrganizationMember" om ON om."organizationId" = e."organizationId"
             WHERE e.id = $1
               AND om."userId" = $2
               AND om.role IN ('OWNER', 'ADMIN')`,
            [eventId, userId]
        );

        if (!hostCheck.rows.length) {
            return res.status(403).json({ error: "NOT_HOST" });
        }

        // Generate a unique, deterministic room name for LiveKit
        const livekitRoom = `event-${eventId}-${cryptoJs.lib.WordArray.random(16).toString(cryptoJs.enc.Hex)}`;

        // Create the room on LiveKit Cloud first
        await roomService.createRoom({
            name: livekitRoom,
            ...(maxParticipants ? { maxParticipants } : {}),
            // Rooms auto-delete after 10 min of being empty
            emptyTimeout: 600,
        });

        // Persist to DB
        const result = await pool.query<{
            id: string;
            name: string;
            livekitRoom: string;
            isActive: boolean;
            maxParticipants: number | null;
            createdAt: Date;
        }>(
            `INSERT INTO "VirtualRoom"
               (id, "eventId", name, "livekitRoom", "maxParticipants", "createdByUserId", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id, name, "livekitRoom", "isActive", "maxParticipants", "createdAt"`,
            [eventId, name.trim(), livekitRoom, maxParticipants ?? null, userId]
        );

        console.log(`[lv-service] Room created: ${livekitRoom} for event ${eventId}`);
        return res.status(201).json({ room: result.rows[0] });
    } catch (err) {
        console.error("[lv-service] POST /rooms error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// ── DELETE /rooms/:id ────────────────────────────────────────────────────────
// Host closes a virtual room — marks inactive in DB and removes from LiveKit.
// Requires: OWNER or ADMIN of the hosting organization.
router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.auth!;

    try {
        // Verify host ownership by joining through the event
        const check = await pool.query<{ livekitRoom: string }>(
            `SELECT vr."livekitRoom"
             FROM "VirtualRoom" vr
             JOIN "Events" e ON e.id = vr."eventId"
             JOIN "OrganizationMember" om ON om."organizationId" = e."organizationId"
             WHERE vr.id = $1
               AND om."userId" = $2
               AND om.role IN ('OWNER', 'ADMIN')
               AND vr."isActive" = true`,
            [id, userId]
        );

        if (!check.rows.length) {
            return res.status(403).json({ error: "NOT_HOST_OR_ALREADY_CLOSED" });
        }

        const { livekitRoom } = check.rows[0];

        // Remove from LiveKit first (best-effort — don't fail if already gone)
        try {
            await roomService.deleteRoom(livekitRoom);
        } catch (lkErr) {
            console.warn(`[lv-service] LiveKit room delete warning (may already be closed):`, lkErr);
        }

        // Mark inactive in DB + close any open sessions
        await Promise.all([
            pool.query(
                `UPDATE "VirtualRoom" SET "isActive" = false, "updatedAt" = NOW() WHERE id = $1`,
                [id]
            ),
            pool.query(
                `UPDATE "VirtualSession"
                 SET "leftAt" = NOW(),
                     "durationSecs" = EXTRACT(EPOCH FROM (NOW() - "joinedAt"))::INT
                 WHERE "roomId" = $1 AND "leftAt" IS NULL`,
                [id]
            ),
        ]);

        console.log(`[lv-service] Room closed: ${livekitRoom}`);
        return res.json({ ok: true });
    } catch (err) {
        console.error("[lv-service] DELETE /rooms/:id error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// ── POST /rooms/:id/kick ─────────────────────────────────────────────────────
// Host removes a specific participant from the room.
router.post("/:id/kick", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { participantIdentity } = req.body as { participantIdentity: string };
    const { userId } = req.auth!;

    if (!participantIdentity) {
        return res.status(400).json({ error: "MISSING_PARTICIPANT_IDENTITY" });
    }

    try {
        // Verify host ownership
        const check = await pool.query<{ livekitRoom: string }>(
            `SELECT vr."livekitRoom"
             FROM "VirtualRoom" vr
             JOIN "Events" e ON e.id = vr."eventId"
             JOIN "OrganizationMember" om ON om."organizationId" = e."organizationId"
             WHERE vr.id = $1
               AND om."userId" = $2
               AND om.role IN ('OWNER', 'ADMIN')`,
            [id, userId]
        );

        if (!check.rows.length) {
            return res.status(403).json({ error: "NOT_HOST" });
        }

        await roomService.removeParticipant(check.rows[0].livekitRoom, participantIdentity);
        return res.json({ ok: true });
    } catch (err) {
        console.error("[lv-service] POST /rooms/:id/kick error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

export default router;
