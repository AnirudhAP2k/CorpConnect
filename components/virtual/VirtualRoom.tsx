"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    LiveKitRoom,
    LocalUserChoices,
    PreJoin,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
    Loader2,
    AlertCircle,
    ArrowLeft,
    Clock,
    CalendarOff,
    DoorClosed,
    CreditCard,
    UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MeetingLayout } from "@/components/virtual/meeting/MeetingLayout";

interface VirtualRoomProps {
    roomId: string;
    eventId: string;
    eventTitle: string;
    isHost: boolean;
    displayName: string;
}

type ConnectionState = "prejoin" | "connecting" | "connected" | "error";

interface ErrorDetails {
    code?: string;
    message: string;
    startsAt?: string;
    endedAt?: string;
}

export function VirtualRoom({
    roomId,
    eventId,
    eventTitle,
    isHost,
    displayName,
}: VirtualRoomProps) {
    const [state, setState] = useState<ConnectionState>("prejoin");
    const [token, setToken] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
    const [userChoices, setUserChoices] = useState<LocalUserChoices | null>(null);
    const sessionStartedRef = useRef(false);
    const sessionClosedRef = useRef(false);

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    const fetchToken = useCallback(async () => {
        setState("connecting");
        setErrorDetails(null);
        try {
            const res = await fetch("/api/virtual/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorDetails({
                    code: data.error,
                    message: data.message ?? "Unable to join this session.",
                    startsAt: data.startsAt,
                    endedAt: data.endedAt,
                });
                setState("error");
                return;
            }

            setToken(data.token);
            setState("connected");
        } catch {
            setErrorDetails({
                code: "NETWORK_ERROR",
                message: "Connection error. Please check your network and try again.",
            });
            setState("error");
        }
    }, [roomId]);

    const handlePreJoinSubmit = useCallback(
        (choices: LocalUserChoices) => {
            setUserChoices(choices);
            fetchToken();
        },
        [fetchToken]
    );

    const recordSessionStart = useCallback(async () => {
        if (sessionStartedRef.current) return;
        sessionStartedRef.current = true;
        sessionClosedRef.current = false;

        try {
            const res = await fetch("/api/virtual/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId }),
            });
            if (!res.ok) {
                sessionStartedRef.current = false;
                console.error("[VirtualRoom] Failed to record session start");
            }
        } catch {
            sessionStartedRef.current = false;
            console.error("[VirtualRoom] Failed to record session start");
        }
    }, [roomId]);

    const recordSessionEnd = useCallback(() => {
        if (!sessionStartedRef.current || sessionClosedRef.current) return;
        sessionClosedRef.current = true;

        const payload = JSON.stringify({ roomId, action: "leave" });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                "/api/virtual/sessions",
                new Blob([payload], { type: "application/json" }),
            );
            return;
        }

        void fetch("/api/virtual/sessions", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId }),
            keepalive: true,
        });
    }, [roomId]);

    useEffect(() => {
        window.addEventListener("pagehide", recordSessionEnd);
        return () => window.removeEventListener("pagehide", recordSessionEnd);
    }, [recordSessionEnd]);

    if (!livekitUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-lg font-semibold">Configuration Error</p>
                <p className="text-sm text-gray-400">NEXT_PUBLIC_LIVEKIT_URL is not configured.</p>
            </div>
        );
    }

    // ── Pre-join screen ──────────────────────────────────────────────────────
    if (state === "prejoin") {
        return (
            <div
                className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-6"
                data-lk-theme="default"
            >
                {/* Back link */}
                <div className="w-full max-w-xl mb-6">
                    <Link
                        href={`/events/${eventId}`}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to event
                    </Link>
                </div>

                <div className="w-full max-w-xl">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-white mb-1">{eventTitle}</h1>
                        <p className="text-gray-400 text-sm">
                            Joining as {displayName}{isHost ? " · Host" : ""}
                        </p>
                    </div>
                    <PreJoin
                        onSubmit={handlePreJoinSubmit}
                        defaults={{ videoEnabled: true, audioEnabled: true }}
                        onError={(err) => setErrorDetails({ message: err.message })}
                    />
                </div>
            </div>
        );
    }

    // ── Connecting ───────────────────────────────────────────────────────────
    if (state === "connecting") {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                <p className="text-lg font-semibold">Joining session…</p>
                <p className="text-sm text-gray-400">Setting up your connection</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (state === "error" || !token) {
        const code = errorDetails?.code;
        const message = errorDetails?.message || "An unexpected error occurred.";

        if (code === "EVENT_NOT_STARTED") {
            const formattedTime = errorDetails?.startsAt
                ? new Date(errorDetails.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                : null;

            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                    <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
                        <Clock className="w-12 h-12 text-amber-400" />
                    </div>
                    <p className="text-xl font-semibold">Session Not Live Yet</p>
                    <p className="text-sm text-gray-400 text-center max-w-sm">
                        {message}
                    </p>
                    {formattedTime && (
                        <p className="text-xs text-amber-300/80 bg-amber-950/40 border border-amber-800/40 rounded-md px-3 py-1.5">
                            Event begins at {formattedTime}. Attendees can enter 15 minutes prior.
                        </p>
                    )}
                    <div className="flex gap-3 mt-3">
                        <Button
                            onClick={fetchToken}
                            variant="outline"
                            className="border-gray-600 text-white hover:bg-gray-800"
                        >
                            Check Again
                        </Button>
                        <Link href={`/events/${eventId}`}>
                            <Button variant="ghost" className="text-gray-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event
                            </Button>
                        </Link>
                    </div>
                </div>
            );
        }

        if (code === "EVENT_ENDED") {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                    <div className="rounded-full bg-gray-500/10 p-4 border border-gray-500/20">
                        <CalendarOff className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-xl font-semibold">Event Has Ended</p>
                    <p className="text-sm text-gray-400 text-center max-w-sm">
                        {message}
                    </p>
                    <Link href={`/events/${eventId}`} className="mt-2">
                        <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event Details
                        </Button>
                    </Link>
                </div>
            );
        }

        if (code === "ROOM_CLOSED") {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                    <div className="rounded-full bg-rose-500/10 p-4 border border-rose-500/20">
                        <DoorClosed className="w-12 h-12 text-rose-400" />
                    </div>
                    <p className="text-xl font-semibold">Virtual Room Closed</p>
                    <p className="text-sm text-gray-400 text-center max-w-sm">
                        {message}
                    </p>
                    <Link href={`/events/${eventId}`} className="mt-2">
                        <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event
                        </Button>
                    </Link>
                </div>
            );
        }

        if (code === "NOT_REGISTERED") {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                    <div className="rounded-full bg-blue-500/10 p-4 border border-blue-500/20">
                        <UserX className="w-12 h-12 text-blue-400" />
                    </div>
                    <p className="text-xl font-semibold">Registration Required</p>
                    <p className="text-sm text-gray-400 text-center max-w-sm">
                        {message}
                    </p>
                    <Link href={`/events/${eventId}`} className="mt-2">
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                            Register for Event
                        </Button>
                    </Link>
                </div>
            );
        }

        if (code === "PAYMENT_REQUIRED") {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                    <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
                        <CreditCard className="w-12 h-12 text-amber-400" />
                    </div>
                    <p className="text-xl font-semibold">Ticket Payment Required</p>
                    <p className="text-sm text-gray-400 text-center max-w-sm">
                        {message}
                    </p>
                    <Link href={`/events/${eventId}`} className="mt-2">
                        <Button className="bg-amber-600 hover:bg-amber-500 text-white">
                            Complete Ticket Purchase
                        </Button>
                    </Link>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-xl font-semibold">Unable to Join</p>
                <p className="text-sm text-gray-400 text-center max-w-sm">{message}</p>
                <div className="flex gap-3 mt-2">
                    <Button
                        onClick={() => setState("prejoin")}
                        variant="outline"
                        className="border-gray-600 text-white hover:bg-gray-800"
                    >
                        Try Again
                    </Button>
                    <Link href={`/events/${eventId}`}>
                        <Button variant="ghost" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Event
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // ── Live room ────────────────────────────────────────────────────────────
    return (
        <div className="h-screen" data-lk-theme="default">
            <LiveKitRoom
                token={token}
                serverUrl={livekitUrl}
                video={userChoices?.videoEnabled ?? true}
                audio={userChoices?.audioEnabled ?? true}
                onConnected={() => {
                    void recordSessionStart();
                }}
                onDisconnected={() => {
                    recordSessionEnd();
                    window.location.href = `/events/${eventId}`;
                }}
                style={{ height: "100dvh" }}
            >
                <MeetingLayout
                    roomId={roomId}
                    eventTitle={eventTitle}
                    isHost={isHost}
                />
            </LiveKitRoom>
        </div>
    );
}
