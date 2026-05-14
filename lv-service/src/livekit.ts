import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const requiredVars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] as const;
for (const v of requiredVars) {
    if (!process.env[v]) throw new Error(`${v} environment variable is required`);
}

const LK_URL = process.env.LIVEKIT_URL!;
const LK_KEY = process.env.LIVEKIT_API_KEY!;
const LK_SECRET = process.env.LIVEKIT_API_SECRET!;

/** Singleton LiveKit room management client (server-to-server) */
export const roomService = new RoomServiceClient(LK_URL, LK_KEY, LK_SECRET);

export interface TokenOptions {
    roomName: string;
    /** Unique participant identity — use userId for deduplication */
    participantIdentity: string;
    /** Display name shown in the UI */
    participantName: string;
    /** true = can send audio/video; false = view-only attendee */
    canPublish: boolean;
    canSubscribe: boolean;
}

/**
 * Generates a short-lived LiveKit access token.
 * This token is returned to the browser and used to connect directly to LiveKit Cloud.
 * The LIVEKIT_API_SECRET never leaves this service.
 */
export async function generateRoomToken(opts: TokenOptions): Promise<string> {
    const at = new AccessToken(LK_KEY, LK_SECRET, {
        identity: opts.participantIdentity,
        name: opts.participantName,
        ttl: "4h",
    });

    at.addGrant({
        roomJoin: true,
        room: opts.roomName,
        canPublish: opts.canPublish,
        canSubscribe: opts.canSubscribe,
        canPublishData: true, // needed for ws-like data messages (Q&A, reactions)
    });

    return at.toJwt();
}
