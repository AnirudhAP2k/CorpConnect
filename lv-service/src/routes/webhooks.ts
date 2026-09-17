import express, { Router, Request, Response } from "express";
import { WebhookReceiver } from "livekit-server-sdk";
import { pool } from "@/db";

const router = Router();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required for webhooks");
}

const receiver = new WebhookReceiver(apiKey, apiSecret);

router.post(
    "/livekit",
    express.raw({ type: ["application/webhook+json", "application/json"] }),
    async (req: Request, res: Response) => {
        try {
            const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
            const event = await receiver.receive(body, req.get("Authorization"));
            const roomName = event.room?.name;

            if (!roomName) {
                return res.status(200).json({ ok: true });
            }

            if (event.event === "participant_joined" && event.participant?.identity) {
                await pool.query(
                    `INSERT INTO "VirtualSession"
                       (id, "roomId", "userId", "organizationId", "joinedAt")
                     SELECT gen_random_uuid(), vr.id, $2::uuid, NULL, NOW()
                     FROM "VirtualRoom" vr
                     WHERE vr."livekitRoom" = $1 AND vr."isActive" = true
                     ON CONFLICT DO NOTHING`,
                    [roomName, event.participant.identity],
                );
            }

            if (
                (event.event === "participant_left" ||
                    event.event === "participant_connection_aborted") &&
                event.participant?.identity
            ) {
                await pool.query(
                    `UPDATE "VirtualSession" vs
                     SET "leftAt" = NOW(),
                         "durationSecs" = GREATEST(
                             0,
                             EXTRACT(EPOCH FROM (NOW() - vs."joinedAt"))::INT
                         )
                     FROM "VirtualRoom" vr
                     WHERE vs."roomId" = vr.id
                       AND vr."livekitRoom" = $1
                       AND vs."userId" = $2::uuid
                       AND vs."leftAt" IS NULL`,
                    [roomName, event.participant.identity],
                );
            }

            if (event.event === "room_finished") {
                await pool.query(
                    `UPDATE "VirtualSession" vs
                     SET "leftAt" = NOW(),
                         "durationSecs" = GREATEST(
                             0,
                             EXTRACT(EPOCH FROM (NOW() - vs."joinedAt"))::INT
                         )
                     FROM "VirtualRoom" vr
                     WHERE vs."roomId" = vr.id
                       AND vr."livekitRoom" = $1
                       AND vs."leftAt" IS NULL`,
                    [roomName],
                );
            }

            return res.status(200).json({ ok: true });
        } catch (err) {
            console.warn("[lv-service] LiveKit webhook rejected:", (err as Error).message);
            return res.status(401).json({ error: "INVALID_WEBHOOK" });
        }
    },
);

export default router;
