"use client";

import { useState } from "react";
import {
    DisconnectButton,
    TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
    Hand,
    MessageSquare,
    PhoneOff,
    SmilePlus,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingControlsProps {
    roomId: string;
    isHost: boolean;
    isHandRaised: boolean;
    chatOpen: boolean;
    participantsOpen: boolean;
    onToggleHand: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onReact: (emoji: string) => void;
}

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉"];

export function MeetingControls({
    roomId,
    isHost,
    isHandRaised,
    chatOpen,
    participantsOpen,
    onToggleHand,
    onToggleChat,
    onToggleParticipants,
    onReact,
}: MeetingControlsProps) {
    const [reactionsOpen, setReactionsOpen] = useState(false);

    const endMeeting = async () => {
        if (!window.confirm("End this meeting for everyone?")) return;

        const res = await fetch(`/api/virtual/rooms/${roomId}`, { method: "DELETE" });
        if (!res.ok) {
            window.alert("Unable to end the meeting. Please try again.");
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-gray-950/95 px-3 py-3">
            <TrackToggle
                source={Track.Source.Microphone}
                aria-label="Toggle microphone"
            />
            <TrackToggle
                source={Track.Source.Camera}
                aria-label="Toggle camera"
            />
            <TrackToggle
                source={Track.Source.ScreenShare}
                aria-label="Toggle screen sharing"
            />

            <Button
                type="button"
                variant={isHandRaised ? "default" : "outline"}
                size="icon"
                onClick={onToggleHand}
                aria-label={isHandRaised ? "Lower hand" : "Raise hand"}
                title={isHandRaised ? "Lower hand" : "Raise hand"}
                className="border-white/20 bg-gray-900 text-white hover:bg-gray-800"
            >
                <Hand className="h-4 w-4" />
            </Button>

            <Button
                type="button"
                variant={chatOpen ? "default" : "outline"}
                size="icon"
                onClick={onToggleChat}
                aria-label="Toggle chat"
                title="Chat"
                className="border-white/20 bg-gray-900 text-white hover:bg-gray-800"
            >
                <MessageSquare className="h-4 w-4" />
            </Button>

            <Button
                type="button"
                variant={participantsOpen ? "default" : "outline"}
                size="icon"
                onClick={onToggleParticipants}
                aria-label="Toggle participants"
                title="Participants"
                className="border-white/20 bg-gray-900 text-white hover:bg-gray-800"
            >
                <Users className="h-4 w-4" />
            </Button>

            <div className="relative">
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setReactionsOpen((open) => !open)}
                    aria-label="Send reaction"
                    aria-expanded={reactionsOpen}
                    title="Reactions"
                    className="border-white/20 bg-gray-900 text-white hover:bg-gray-800"
                >
                    <SmilePlus className="h-4 w-4" />
                </Button>
                {reactionsOpen && (
                    <div className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-gray-900 p-2 shadow-xl">
                        {REACTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    onReact(emoji);
                                    setReactionsOpen(false);
                                }}
                                className="rounded-full p-1 text-xl hover:bg-white/10"
                                aria-label={`React with ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isHost && (
                <Button
                    type="button"
                    variant="destructive"
                    onClick={endMeeting}
                    className="gap-2"
                >
                    <PhoneOff className="h-4 w-4" />
                    End meeting
                </Button>
            )}

            <DisconnectButton className="lk-button lk-disconnect-button" aria-label="Leave meeting">
                <PhoneOff className="h-4 w-4" />
                <span>Leave</span>
            </DisconnectButton>
        </div>
    );
}
