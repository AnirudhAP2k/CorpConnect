"use client";

import axios from "axios";
import { useEffect, useRef, useCallback } from "react";

type Referrer = "search" | "dashboard" | "recommendation" | "direct" | string;

interface UseEventViewOptions {
    eventId: string;
    referrer?: Referrer;
    /** Minimum seconds on page before recording view (default: 3) */
    minSeconds?: number;
}

/**
 * useEventView — tracks event detail page views with engagement duration.
 *
 * Industry-standard approach:
 * 1. On mount: generates a sessionId, waits `minSeconds`, then POSTs view to API.
 * 2. On unmount / tab close: sends PATCH with durationSeconds via navigator.sendBeacon.
 *
 * The sessionId is stable for the lifetime of the component.
 */
export function useEventView({ eventId, referrer = "direct", minSeconds = 3 }: UseEventViewOptions) {
    const sessionId = useRef<string>(crypto.randomUUID());
    const startTime = useRef<number>(Date.now());
    const recorded = useRef<boolean>(false);

    // Record view start after minimum dwell time
    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                await axios.post(`/api/events/${eventId}/view`, {
                    sessionId: sessionId.current,
                    referrer,
                } as RequestInit);
                recorded.current = true;
            } catch {
                // Silently ignore network errors
            }
        }, minSeconds * 1000);

        return () => clearTimeout(timer);
    }, [eventId, referrer, minSeconds]);

    // Record duration on page leave using sendBeacon (survives tab close)
    const sendDuration = useCallback(async () => {
        if (!recorded.current) return;

        const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
        if (durationSeconds <= 0) return;

        const payload = JSON.stringify({ sessionId: sessionId.current, durationSeconds });

        // sendBeacon works even when the page is closing
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(`/api/events/${eventId}/view`, blob);
        } else {
            // Fallback for browsers without sendBeacon
            axios.patch(`/api/events/${eventId}/view`, {
                sessionId: sessionId.current,
                durationSeconds,
                keepalive: true,
            } as RequestInit).catch(() => { });
        }
    }, [eventId]);

    useEffect(() => {
        // Handle tab close / navigate away
        window.addEventListener("beforeunload", sendDuration);
        // Handle React navigation (SPA route change)
        return () => {
            window.removeEventListener("beforeunload", sendDuration);
            sendDuration();
        };
    }, [sendDuration]);
}
