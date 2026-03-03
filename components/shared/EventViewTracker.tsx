"use client";

import { useEventView } from "@/hooks/useEventView";

interface EventViewTrackerProps {
    eventId: string;
    referrer?: string;
}

/**
 * Invisible client component whose sole purpose is to call useEventView.
 * Drop this into any server component event detail page.
 */
export default function EventViewTracker({ eventId, referrer }: EventViewTrackerProps) {
    useEventView({ eventId, referrer });
    return null;
}
