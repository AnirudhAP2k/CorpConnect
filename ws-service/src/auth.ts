import { jwtVerify } from "jose";

export interface SocketAuthPayload {
	userId: string;
	activeOrgId: string;
}

/**
 * Verifies the short-lived, audience-scoped token issued by
 * POST /api/messaging/ws-token. It is signed with a WebSocket-only secret,
 * never the NextAuth session secret.
 */
export async function verifySocketAuth(
	token: string,
): Promise<SocketAuthPayload> {
	if (!process.env.WS_SERVICE_AUTH_SECRET) {
		throw new Error("WS_SERVICE_AUTH_SECRET environment variable is required");
	}

	const secret = new TextEncoder().encode(process.env.WS_SERVICE_AUTH_SECRET);
	const decoded = await jwtVerify(token, secret, {
		algorithms: [process.env.HASHING_ALGO || "HS256"],
		issuer: "corpconnect-next",
		audience: "corpconnect-ws",
		clockTolerance: 5,
	});

	const userId = decoded.payload["userId"] as string | undefined;
	const activeOrgId = decoded.payload["activeOrgId"] as string | undefined;

	if (!userId || !activeOrgId) {
		throw new Error("Token missing required fields: userId, activeOrgId");
	}
	if (decoded.payload.sub !== userId) {
		throw new Error("Token subject does not match userId");
	}

	return { userId, activeOrgId };
}
