/**
 * Tests for lib/rate-limit.ts — the fixed-window limiter guarding the
 * login / register / password-reset endpoints.
 */

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// Unique key per test so the module-level bucket Map never bleeds state.
let seq = 0;
const uniqueKey = () => `test-key-${++seq}`;

function fakeRequest(headers: Record<string, string>): NextRequest {
    return {
        headers: {
            get: (name: string) => headers[name.toLowerCase()] ?? null,
        },
    } as unknown as NextRequest;
}

describe("rateLimit", () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: new Date("2026-07-22T10:00:00Z") });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("allows requests up to the limit and reports remaining quota", () => {
        const key = uniqueKey();
        const options = { limit: 3, windowMs: 60_000 };

        expect(rateLimit(key, options)).toEqual({ success: true, retryAfter: 0, remaining: 2 });
        expect(rateLimit(key, options)).toEqual({ success: true, retryAfter: 0, remaining: 1 });
        expect(rateLimit(key, options)).toEqual({ success: true, retryAfter: 0, remaining: 0 });
    });

    it("blocks the request that exceeds the limit with a Retry-After hint", () => {
        const key = uniqueKey();
        const options = { limit: 2, windowMs: 60_000 };

        rateLimit(key, options);
        rateLimit(key, options);
        const blocked = rateLimit(key, options);

        expect(blocked.success).toBe(false);
        expect(blocked.remaining).toBe(0);
        expect(blocked.retryAfter).toBe(60);
    });

    it("counts down retryAfter as the window progresses", () => {
        const key = uniqueKey();
        const options = { limit: 1, windowMs: 60_000 };

        rateLimit(key, options);
        jest.advanceTimersByTime(45_000);

        const blocked = rateLimit(key, options);
        expect(blocked.success).toBe(false);
        expect(blocked.retryAfter).toBe(15);
    });

    it("resets the counter once the window has elapsed", () => {
        const key = uniqueKey();
        const options = { limit: 1, windowMs: 60_000 };

        expect(rateLimit(key, options).success).toBe(true);
        expect(rateLimit(key, options).success).toBe(false);

        jest.advanceTimersByTime(60_001);

        expect(rateLimit(key, options)).toEqual({ success: true, retryAfter: 0, remaining: 0 });
    });

    it("tracks identifiers independently (per IP / per account)", () => {
        const options = { limit: 1, windowMs: 60_000 };
        const alice = uniqueKey();
        const bob = uniqueKey();

        expect(rateLimit(alice, options).success).toBe(true);
        expect(rateLimit(alice, options).success).toBe(false);
        // Bob's bucket is untouched by Alice exhausting hers.
        expect(rateLimit(bob, options).success).toBe(true);
    });
});

describe("getClientIp", () => {
    it("uses the first entry of x-forwarded-for", () => {
        const req = fakeRequest({ "x-forwarded-for": "203.0.113.9, 10.0.0.1, 10.0.0.2" });
        expect(getClientIp(req)).toBe("203.0.113.9");
    });

    it("falls back to x-real-ip", () => {
        const req = fakeRequest({ "x-real-ip": " 198.51.100.7 " });
        expect(getClientIp(req)).toBe("198.51.100.7");
    });

    it("returns 'unknown' when no proxy headers exist", () => {
        expect(getClientIp(fakeRequest({}))).toBe("unknown");
    });
});
