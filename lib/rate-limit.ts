import type { NextRequest } from "next/server";

/**
 * Lightweight fixed-window rate limiter.
 *
 * Backed by an in-process Map, so limits are enforced per server instance. This
 * is a pragmatic first line of defense against brute-force / abuse on sensitive
 * endpoints (auth, password reset). For strict, cross-instance guarantees under
 * horizontal scaling, back this with a shared store (Redis) — the public API
 * here is intentionally store-agnostic so callers won't change.
 *
 * Only usable on the Node.js runtime (module state does not persist on Edge).
 */

interface WindowState {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, WindowState>();

// Opportunistic cleanup so the Map cannot grow unbounded over time.
let lastSweep = 0;
function sweep(now: number): void {
    if (now - lastSweep < 60_000) return;
    lastSweep = now;
    for (const [key, state] of buckets) {
        if (state.resetAt <= now) buckets.delete(key);
    }
}

export interface RateLimitResult {
    success: boolean;
    /** Seconds until the window resets (only meaningful when blocked). */
    retryAfter: number;
    remaining: number;
}

export interface RateLimitOptions {
    /** Max requests allowed within the window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
}

/**
 * Records a hit for `identifier` and reports whether it is within the limit.
 */
export function rateLimit(identifier: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    sweep(now);

    const existing = buckets.get(identifier);

    if (!existing || existing.resetAt <= now) {
        buckets.set(identifier, { count: 1, resetAt: now + options.windowMs });
        return { success: true, retryAfter: 0, remaining: options.limit - 1 };
    }

    if (existing.count >= options.limit) {
        return {
            success: false,
            retryAfter: Math.ceil((existing.resetAt - now) / 1000),
            remaining: 0,
        };
    }

    existing.count += 1;
    return { success: true, retryAfter: 0, remaining: options.limit - existing.count };
}

/**
 * Best-effort client IP from proxy headers, falling back to a constant so the
 * limiter still functions (globally) when no IP is available.
 */
export function getClientIp(req: NextRequest): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();
    return req.headers.get("x-real-ip")?.trim() || "unknown";
}
