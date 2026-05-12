"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { Socket } from "socket.io-client";

// Lazy-import socket.io-client to avoid SSR issues
let io: typeof import("socket.io-client").io | undefined;

/**
 * Returns a singleton Socket.io client instance authenticated with the WS token
 * minted by NextAuth. Re-connects automatically when the active org changes.
 *
 * The singleton pattern prevents multiple connections being created when the
 * hook is used in several components on the same page.
 */
let socketSingleton: Socket | null = null;
let currentOrgId: string | null = null;

export function useSocket() {
    const { data: session, status } = useSession();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const cleanupRef = useRef<() => void>(() => {});

    useEffect(() => {
        if (status !== "authenticated" || !session?.wsToken || !session?.user?.activeOrganizationId) {
            return;
        }

        const activeOrgId = session.user.activeOrganizationId;
        const wsToken = session.wsToken;
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

        if (!wsUrl) {
            console.warn("[useSocket] NEXT_PUBLIC_WS_URL is not set");
            return;
        }

        // Disconnect existing socket if the active org has changed
        if (socketSingleton && currentOrgId !== activeOrgId) {
            socketSingleton.disconnect();
            socketSingleton = null;
            currentOrgId = null;
        }

        // Reuse existing socket if already connected for this org
        if (socketSingleton) {
            setSocket(socketSingleton);
            setConnected(socketSingleton.connected);
            return;
        }

        // Dynamically import socket.io-client (avoids SSR bundle issues)
        import("socket.io-client").then(({ io: ioFn }) => {
            io = ioFn;
            const newSocket = ioFn(wsUrl, {
                auth: { token: wsToken },
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2_000,
            });

            newSocket.on("connect", () => {
                console.log("[useSocket] Connected:", newSocket.id);
                setConnected(true);
            });

            newSocket.on("disconnect", (reason) => {
                console.log("[useSocket] Disconnected:", reason);
                setConnected(false);
            });

            newSocket.on("connect_error", (err) => {
                console.error("[useSocket] Connection error:", err.message);
                setConnected(false);
            });

            socketSingleton = newSocket;
            currentOrgId = activeOrgId;
            setSocket(newSocket);
        });

        cleanupRef.current = () => {
            // Don't disconnect on unmount — the socket is a singleton that persists
            // across page navigations. Only disconnect on org change (handled above).
        };
    }, [status, session?.wsToken, session?.user?.activeOrganizationId]);

    return { socket, connected };
}
