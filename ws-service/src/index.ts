import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { verifySocketAuth } from "@/auth";
import { registerMessageHandlers } from "@/handlers/message";
import { orgNotificationRoom } from "@/rooms";

const PORT = parseInt(process.env.WS_PORT ?? "4000", 10);
const NEXTJS_URL = process.env.NEXTJS_URL ?? "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

async function main(): Promise<void> {
    // ── HTTP server (Socket.io piggybacks on this) ──────────────────────────────
    const httpServer = createServer((req, res) => {
        // Basic health check endpoint for Docker / load balancer
        if (req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", service: "corpconnect-ws" }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    // ── Socket.io server ────────────────────────────────────────────────────────
    const io = new Server(httpServer, {
        cors: {
            origin: NEXTJS_URL,
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60_000,
        pingInterval: 25_000,
    });

    try {
        const client = createClient({ url: REDIS_URL });
        await client.connect();
        await client.ping();
        client.disconnect();
        console.log("[ws-service] Redis connected");
    } catch (error) {
        console.error("[ws-service] Redis connection failed:", error);
        process.exit(1);
    }

    // ── Redis adapter (enables horizontal scaling across replicas) ──────────────
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => console.error("[redis pub]", err));
    subClient.on("error", (err) => console.error("[redis sub]", err));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log(`[ws-service] Redis adapter connected (${REDIS_URL})`);

    // ── Authentication middleware ───────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth["token"] as string | undefined;
            if (!token) throw new Error("No token provided");

            const payload = await verifySocketAuth(token);
            socket.data["userId"] = payload.userId;
            socket.data["activeOrgId"] = payload.activeOrgId;
            next();
        } catch (err) {
            console.warn("[ws-service] Auth failed:", (err as Error).message);
            next(new Error("AUTH_FAILED"));
        }
    });

    // ── Connection handler ──────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        const orgId = socket.data["activeOrgId"] as string;
        console.log(`[ws-service] Connected: socket=${socket.id} org=${orgId}`);

        // Auto-join the org's personal notification room for unread badges
        socket.join(orgNotificationRoom(orgId));

        registerMessageHandlers(io, socket);

        socket.on("disconnect", (reason) => {
            console.log(`[ws-service] Disconnected: socket=${socket.id} reason=${reason}`);
        });
    });

    // ── Start ───────────────────────────────────────────────────────────────────
    httpServer.listen(PORT, () => {
        console.log(`[ws-service] Listening on port ${PORT}`);
        console.log(`[ws-service] Accepting connections from ${NEXTJS_URL}`);
    });
}

main().catch((err) => {
    console.error("[ws-service] Fatal error:", err);
    process.exit(1);
});
