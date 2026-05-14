"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LiveKitRoom,
    VideoConference,
    formatChatMessageLinks,
    LocalUserChoices,
    PreJoin,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface VirtualRoomProps {
    roomId: string;
    eventId: string;
    eventTitle: string;
}

type ConnectionState = "prejoin" | "connecting" | "connected" | "error";

export function VirtualRoom({ roomId, eventId, eventTitle }: VirtualRoomProps) {
    const [state, setState] = useState<ConnectionState>("prejoin");
    const [token, setToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userChoices, setUserChoices] = useState<LocalUserChoices | null>(null);

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    const fetchToken = useCallback(async () => {
        setState("connecting");
        setError(null);
        try {
            const res = await fetch("/api/virtual/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message ?? "Unable to join this session.");
                setState("error");
                return;
            }

            setToken(data.token);
            setState("connected");
        } catch {
            setError("Connection error. Please check your network and try again.");
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
                        <p className="text-gray-400 text-sm">Configure your camera and microphone before joining</p>
                    </div>
                    <PreJoin
                        onSubmit={handlePreJoinSubmit}
                        defaults={{ videoEnabled: true, audioEnabled: true }}
                        onError={(err) => setError(err.message)}
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
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white gap-4 p-6">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-xl font-semibold">Unable to Join</p>
                <p className="text-sm text-gray-400 text-center max-w-sm">{error}</p>
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
                onDisconnected={() => {
                    // Redirect back to the event page when the user leaves
                    window.location.href = `/events/${eventId}`;
                }}
                style={{ height: "100dvh" }}
            >
                <VideoConference
                    chatMessageFormatter={formatChatMessageLinks}
                />
            </LiveKitRoom>
        </div>
    );
}
