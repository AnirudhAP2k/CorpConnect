"use client";

import { useState, useCallback } from "react";
import {
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    StartAudio,
    useConnectionState,
    useLocalParticipant,
    useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { MeetingChat } from "@/components/virtual/meeting/MeetingChat";
import { MeetingControls } from "@/components/virtual/meeting/MeetingControls";
import { ParticipantList } from "@/components/virtual/meeting/ParticipantList";
import { ReactionsOverlay } from "@/components/virtual/meeting/ReactionsOverlay";
import { useVirtualRoomSocket } from "@/hooks/useVirtualRoomSocket";

interface MeetingLayoutProps {
    roomId: string;
    eventTitle: string;
    isHost: boolean;
}

export function MeetingLayout({
    roomId,
    eventTitle,
    isHost,
}: MeetingLayoutProps) {
    const [chatOpen, setChatOpen] = useState(false);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const liveKitConnectionState = useConnectionState();
    const { localParticipant } = useLocalParticipant();

    const handleAskUnmute = useCallback((kind: "audio" | "video") => {
        const isAudio = kind === "audio";
        toast.info(
            `The host has asked you to unmute your ${isAudio ? "microphone" : "camera"}.`,
            {
                action: {
                    label: isAudio ? "Unmute Mic" : "Start Camera",
                    onClick: () => {
                        if (isAudio) {
                            void localParticipant.setMicrophoneEnabled(true);
                        } else {
                            void localParticipant.setCameraEnabled(true);
                        }
                    },
                },
                duration: 10000,
            },
        );
    }, [localParticipant]);

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );
    const {
        connected,
        raisedHands,
        reactions,
        isHandRaised,
        toggleHand,
        lowerHand,
        askUnmute,
        react,
    } = useVirtualRoomSocket(roomId, {
        enabled: liveKitConnectionState === ConnectionState.Connected,
        onAskUnmute: handleAskUnmute,
    });

    return (
        <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gray-950 text-white">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div className="min-w-0">
                    <h1 className="truncate font-semibold">{eventTitle}</h1>
                    <p className="text-xs text-gray-400">
                        {isHost ? "Hosting" : "Attending"} · Live meeting
                    </p>
                </div>
                <span
                    className={`flex items-center gap-1 text-xs ${
                        connected ? "text-emerald-300" : "text-amber-300"
                    }`}
                >
                    {connected ? (
                        <Wifi className="h-3 w-3" />
                    ) : (
                        <WifiOff className="h-3 w-3" />
                    )}
                    {connected ? "Realtime connected" : "Realtime unavailable"}
                </span>
            </header>

            <div className="relative flex min-h-0 flex-1">
                <main className="relative min-w-0 flex-1 p-2 md:p-4">
                    <GridLayout
                        tracks={tracks}
                        className="h-full"
                    >
                        <ParticipantTile />
                    </GridLayout>
                    <ReactionsOverlay reactions={reactions} />
                </main>

                {chatOpen && (
                    <div className="absolute inset-y-0 right-0 z-20 w-full max-w-sm md:relative md:z-auto">
                        <MeetingChat />
                    </div>
                )}

                {participantsOpen && (
                    <div className="absolute inset-y-0 right-0 z-20 w-full max-w-sm md:relative md:z-auto">
                        <ParticipantList
                            roomId={roomId}
                            isHost={isHost}
                            raisedHands={raisedHands}
                            onLowerHand={lowerHand}
                            onAskUnmute={askUnmute}
                        />
                    </div>
                )}
            </div>

            <MeetingControls
                roomId={roomId}
                isHost={isHost}
                isHandRaised={isHandRaised}
                chatOpen={chatOpen}
                participantsOpen={participantsOpen}
                onToggleHand={toggleHand}
                onToggleChat={() => {
                    setChatOpen((open) => !open);
                    setParticipantsOpen(false);
                }}
                onToggleParticipants={() => {
                    setParticipantsOpen((open) => !open);
                    setChatOpen(false);
                }}
                onReact={react}
            />
            <RoomAudioRenderer />
            <StartAudio label="Click to enable meeting audio" />
        </div>
    );
}
