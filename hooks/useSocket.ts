"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";

/**
 * Returns a Socket.io client authenticated with the WS token minted by NextAuth,
 * reconnecting automatically when the active org changes.
 *
 * The socket is module-scoped so that several components on the same page share a
 * single connection, while `connected` is tracked per hook instance.
 */
let socketSingleton: Socket | null = null;
let currentOrgId: string | null = null;
let pendingConnection: Promise<Socket> | null = null;
let reconnectTimer: number | null = null;

const fetchWsToken = async (): Promise<string> => {
	const response = await fetch("/api/messaging/ws-token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error(`WS token request failed (${response.status})`);
	}

	const data = (await response.json()) as { token?: string };
	if (!data.token) throw new Error("WS token response did not include a token");
	return data.token;
};

const disconnectSocket = () => {
	if (reconnectTimer) {
		window.clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
	socketSingleton?.disconnect();
	socketSingleton = null;
	currentOrgId = null;
	pendingConnection = null;
};

const connectSocket = async (
	wsUrl: string,
	orgId: string,
): Promise<Socket> => {
	// Active org changed — tear the old connection down before opening a new one.
	if (socketSingleton && currentOrgId !== orgId) {
		disconnectSocket();
	}

	if (socketSingleton) return Promise.resolve(socketSingleton);

	// Concurrent callers await the same in-flight connection rather than each
	// opening their own socket and racing to overwrite the singleton.
	if (!pendingConnection) {
		pendingConnection = import("socket.io-client").then(({ io }) => {
			const socket = io(wsUrl, {
				// Socket.IO invokes this callback for every connection attempt,
				// including reconnects, so an expired bearer token is never reused.
				auth: async (callback) => {
					try {
						callback({ token: await fetchWsToken() });
					} catch (error) {
						console.error("[useSocket] Failed to mint WS token:", error);
						callback({ token: "" });
					}
				},
				transports: ["websocket"],
				reconnection: true,
				reconnectionAttempts: 5,
				reconnectionDelay: 2_000,
			});

			socket.on("connect_error", () => {
				// Socket.IO does not automatically retry middleware-denied
				// connections; retry with a newly minted token.
				if (!socket.active) {
					if (reconnectTimer) window.clearTimeout(reconnectTimer);
					reconnectTimer = window.setTimeout(() => {
						reconnectTimer = null;
						if (socket === socketSingleton) socket.connect();
					}, 2_000);
				}
			});

			socketSingleton = socket;
			currentOrgId = orgId;
			return socket;
		});
	}

	return pendingConnection;
};

export const useSocket = () => {
	const { data: session, status } = useSession();
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const activeOrgId = session?.user?.activeOrganizationId;
		const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

		if (
			status === "unauthenticated" ||
			(status === "authenticated" && !activeOrgId)
		) {
			disconnectSocket();
			queueMicrotask(() => {
				setSocket(null);
				setConnected(false);
			});
			return;
		}

		if (status !== "authenticated" || !activeOrgId) return;

		if (!wsUrl) {
			console.warn("[useSocket] NEXT_PUBLIC_WS_URL is not set");
			return;
		}

		let cancelled = false;
		let attached: Socket | null = null;

		const onConnect = () => setConnected(true);
		const onDisconnect = (reason: string) => {
			console.log("[useSocket] Disconnected:", reason);
			setConnected(false);
		};
		const onConnectError = (err: Error) => {
			console.error("[useSocket] Connection error:", err.message);
			setConnected(false);
		};

		connectSocket(wsUrl, activeOrgId)
			.then((activeSocket) => {
				if (cancelled) return;

				attached = activeSocket;

				// Listeners are registered per hook instance so every consumer —
				// not only the one that opened the socket — sees state changes.
				activeSocket.on("connect", onConnect);
				activeSocket.on("disconnect", onDisconnect);
				activeSocket.on("connect_error", onConnectError);

				setSocket(activeSocket);
				setConnected(activeSocket.connected);
			})
			.catch((err) => {
				console.error("[useSocket] Failed to initialise socket:", err);
			});

		return () => {
			cancelled = true;

			// The socket stays connected on purpose — it is shared across page
			// navigations — but this instance's listeners must be removed.
			attached?.off("connect", onConnect);
			attached?.off("disconnect", onDisconnect);
			attached?.off("connect_error", onConnectError);
		};
	}, [status, session?.user?.activeOrganizationId]);

	return { socket, connected };
};
