"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Clock, CreditCard, Lock } from "lucide-react";

interface JoinVirtualButtonProps {
    eventId: string;
    roomId: string;
    roomName: string;
    eventType: "ONLINE" | "OFFLINE" | "HYBRID";
    isRegistered: boolean;
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
    isRegistered,
    isPaid,
    isFree,
    startDateTime,
    endDateTime,
    className = "",
}: JoinVirtualButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Gate: only ONLINE or HYBRID events have virtual sessions
    if (eventType === "OFFLINE") return null;

    // Gate: user must be registered
    if (!isRegistered) return null;

    // Gate: paid events require payment confirmation
    if (!isFree && !isPaid) {
        return (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Complete payment to access the virtual session.</span>
            </div>
        );
    }

    const now = new Date();
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    // Allow joining 15 minutes early
    const joinFrom = new Date(start.getTime() - 15 * 60 * 1000);

    // Gate: not started yet
    if (now < joinFrom) {
        return (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                    Virtual session opens at{" "}
                    <strong>
                        {new Date(joinFrom).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </strong>
                </span>
            </div>
        );
    }

    // Gate: event ended
    if (now > end) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <Lock className="w-4 h-4 shrink-0" />
                <span>This virtual session has ended.</span>
            </div>
        );
    }

    const handleJoin = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/virtual/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.message ?? "Unable to join the session.");
                return;
            }

            // Navigate to the full-screen join page — token will be re-fetched there
            router.push(`/events/${eventId}/join/${roomId}`);
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [eventId, roomId, router]);

    return (
        <div className="space-y-2">
            <Button
                onClick={handleJoin}
                disabled={loading}
                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-5 text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] gap-2 ${className}`}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Video className="w-5 h-5" />
                )}
                {loading ? "Connecting…" : `Join "${roomName}"`}
            </Button>
            {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                </p>
            )}
        </div>
    );
}
