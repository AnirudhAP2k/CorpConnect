import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { verifyInternalToken, InternalAuthPayload } from "@/auth";
import roomsRouter from "@/routes/rooms";
import tokenRouter from "@/routes/token";

// Extend Express request type to carry auth payload
declare global {
    namespace Express {
        interface Request {
            auth?: InternalAuthPayload;
        }
    }
}

const PORT = parseInt(process.env.LV_PORT ?? "5000", 10);
const NEXTJS_URL = process.env.NEXTJS_URL ?? "http://localhost:3000";

const app = express();
app.use(express.json());

// ── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "corpconnect-lv", port: PORT });
});

// ── Auth middleware (all routes below require a valid internal JWT) ───────────
app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "MISSING_TOKEN" });
        }
        const token = authHeader.slice(7);
        req.auth = await verifyInternalToken(token);
        next();
    } catch (err) {
        console.warn("[lv-service] Auth failed:", (err as Error).message);
        return res.status(401).json({ error: "UNAUTHORIZED" });
    }
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/rooms", roomsRouter);
app.use("/token", tokenRouter);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "NOT_FOUND" });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[lv-service] Unhandled error:", err);
    res.status(500).json({ error: "INTERNAL_ERROR" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[lv-service] Listening on port ${PORT}`);
    console.log(`[lv-service] Accepting internal calls from ${NEXTJS_URL}`);
});
