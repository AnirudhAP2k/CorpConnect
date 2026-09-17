import { Router, Request, Response } from "express";
import { pool } from "@/db";

const router = Router();

// Record a session only after the browser has actually connected to LiveKit.
router.post("/", async (req: Request, res: Response) => {
    const { roomId } = req.body as { roomId?: string };
    const { userId, activeOrgId } = req.auth!;

    if (!roomId) {
        return res.status(400).json({ error: "MISSING_ROOM_ID" });
    }

    try {
        const accessResult = await pool.query<{
            isFree: boolean;
            isPaid: boolean | null;
            isParticipant: boolean;
            isHost: boolean;
        }>(
            `SELECT e."isFree",
                    ep."isPaid",
                    (ep.id IS NOT NULL) AS "isParticipant",
                    EXISTS (
                        SELECT 1
                        FROM "OrganizationMember" om
                        WHERE om."organizationId" = e."organizationId"
                          AND om."userId" = $2
                          AND om.role IN ('OWNER', 'ADMIN')
                    ) AS "isHost"
             FROM "VirtualRoom" vr
             JOIN "Events" e ON e.id = vr."eventId"
             LEFT JOIN "EventParticipation" ep
               ON ep."eventId" = e.id
              AND ep."userId" = $2
              AND ep.status NOT IN ('CANCELLED', 'WAITLISTED')
             WHERE vr.id = $1
               AND vr."isActive" = true
               AND NOW() BETWEEN (e."startDateTime" - INTERVAL '15 minutes') AND e."endDateTime"`,
            [roomId, userId],
        );

        if (!accessResult.rows.length) {
            return res.status(403).json({ error: "SESSION_ACCESS_DENIED" });
        }

        const access = accessResult.rows[0];
        if (!access.isParticipant && !access.isHost) {
            return res.status(403).json({ error: "NOT_REGISTERED" });
        }
        if (access.isParticipant && !access.isHost && !access.isFree && !access.isPaid) {
            return res.status(403).json({ error: "PAYMENT_REQUIRED" });
        }

        await pool.query(
            `INSERT INTO "VirtualSession" (id, "roomId", "userId", "organizationId", "joinedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             ON CONFLICT DO NOTHING`,
            [roomId, userId, activeOrgId || null],
        );

        return res.status(201).json({ ok: true });
    } catch (err) {
        console.error("[lv-service] POST /sessions error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// Idempotently close the caller's open session on disconnect/page exit.
router.post("/leave", async (req: Request, res: Response) => {
    const { roomId } = req.body as { roomId?: string };
    const { userId } = req.auth!;

    if (!roomId) {
        return res.status(400).json({ error: "MISSING_ROOM_ID" });
    }

    try {
        await pool.query(
            `UPDATE "VirtualSession"
             SET "leftAt" = NOW(),
                 "durationSecs" = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - "joinedAt"))::INT)
             WHERE "roomId" = $1 AND "userId" = $2 AND "leftAt" IS NULL`,
            [roomId, userId],
        );
        return res.json({ ok: true });
    } catch (err) {
        console.error("[lv-service] POST /sessions/leave error:", err);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

export default router;
