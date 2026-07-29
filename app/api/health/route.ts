/**
 * app/api/health/route.ts
 *
 * Liveness/readiness probe for the Next.js app, mirroring the `/health`
 * endpoints already exposed by ws-service, lv-service, and ai-service.
 *
 * Used by the compose healthcheck and the reverse proxy, so it must never be
 * cached or statically prerendered, and must not require authentication.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    const startedAt = Date.now();

    try {
        // Cheapest possible round-trip that proves the pool can reach Postgres.
        await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
        console.error("[Health] Database check failed:", error);

        return NextResponse.json(
            {
                status: "error",
                service: "corpconnect-web",
                database: "unreachable",
            },
            { status: 503, headers: { "Cache-Control": "no-store" } },
        );
    }

    return NextResponse.json(
        {
            status: "ok",
            service: "corpconnect-web",
            database: "ok",
            latencyMs: Date.now() - startedAt,
            uptimeSeconds: Math.round(process.uptime()),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
    );
}
