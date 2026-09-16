"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Video, Clock, CreditCard, Lock } from "lucide-react";

interface JoinVirtualButtonProps {
    eventId: string;
    roomId: string;
    roomName: string;
    eventType: "ONLINE" | "OFFLINE" | "HYBRID";
    hasAccess: boolean;
    isPaid: boolean;
    isFree: boolean;
    startDateTime: string;
    endDateTime: string;
    className?: string;
}

export function JoinVirtualButton({
    eventId,
    roomId,
    roomName,
    eventType,
    hasAccess,
    isPaid,
    isFree,
    startDateTime,
    endDateTime,
    className = "",
}: JoinVirtualButtonProps) {
    const router = useRouter();
    const [nowMs, setNowMs] = useState(() => Date.now());
    const startMs = new Date(startDateTime).getTime();
    const endMs = new Date(endDateTime).getTime();
    const joinFromMs = startMs - 15 * 60 * 1000;

    // Re-render precisely when the join window opens and when the event ends.
    useEffect(() => {
        const nextBoundary =
            nowMs < joinFromMs ? joinFromMs :
            nowMs <= endMs ? endMs + 1 :
            null;

        if (nextBoundary === null) return;

        const timeout = window.setTimeout(
            () => setNowMs(Date.now()),
            Math.min(nextBoundary - nowMs, 2_147_000_000),
        );
        return () => window.clearTimeout(timeout);
    }, [endMs, joinFromMs, nowMs]);

    // Gate: only ONLINE or HYBRID events have virtual sessions
    if (eventType === "OFFLINE") return null;

    // Gate: user must be registered
    if (!hasAccess) return null;

    // Gate: paid events require payment confirmation
    if (!isFree && !isPaid) {
        return (
            <div className="flex items-center gap-2 text-sm text-nx-on-warning-container bg-nx-warning-container border border-nx-warning/30 rounded-lg p-3">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Complete payment to access the virtual session.</span>
            </div>
        );
    }

    // Gate: not started yet
    if (nowMs < joinFromMs) {
        return (
            <div className="flex items-center gap-2 text-sm text-nx-on-tertiary-container bg-nx-tertiary-container border border-nx-tertiary/30 rounded-lg p-3">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                    Virtual session opens at{" "}
                    <strong>
                        {new Date(joinFromMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </strong>
                </span>
            </div>
        );
    }

    // Gate: event ended
    if (nowMs > endMs) {
        return (
            <div className="flex items-center gap-2 text-sm text-nx-on-surface-variant bg-nx-surface-container-low border border-nx-outline-variant/30 rounded-lg p-3">
                <Lock className="w-4 h-4 shrink-0" />
                <span>This virtual session has ended.</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Button
                onClick={() => router.push(`/events/${eventId}/join/${roomId}`)}
                className={`w-full bg-gradient-to-r from-nx-tertiary to-nx-primary hover:from-nx-tertiary/90 hover:to-nx-primary/90 text-nx-on-primary font-semibold py-5 text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] gap-2 ${className}`}
            >
                <Video className="w-5 h-5" />
                {`Join "${roomName}"`}
            </Button>
        </div>
    );
}
