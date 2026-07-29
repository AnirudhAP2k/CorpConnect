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

function connectSocket(wsUrl: string, wsToken: string, orgId: string): Promise<Socket> {
    // Active org changed — tear the old connection down before opening a new one.
    if (socketSingleton && currentOrgId !== orgId) {
        socketSingleton.disconnect();
        socketSingleton = null;
        currentOrgId = null;
        pendingConnection = null;
    }

    if (socketSingleton) return Promise.resolve(socketSingleton);

    // Concurrent callers await the same in-flight connection rather than each
    // opening their own socket and racing to overwrite the singleton.
    if (!pendingConnection) {
        pendingConnection = import("socket.io-client").then(({ io }) => {
            const socket = io(wsUrl, {
                auth: { token: wsToken },
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2_000,
            });

            socketSingleton = socket;
            currentOrgId = orgId;
            return socket;
        });
    }

    return pendingConnection;
}

export function useSocket() {
    const { data: session, status } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const wsToken = session?.wsToken;
        const activeOrgId = session?.user?.activeOrganizationId;
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (status !== "authenticated" || !wsToken || !activeOrgId) return;

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

        connectSocket(wsUrl, wsToken, activeOrgId)
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
    }, [status, session?.wsToken, session?.user?.activeOrganizationId]);

    return { socket, connected };
}
