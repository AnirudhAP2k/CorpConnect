"use client";

import {
    useLocalParticipant,
    useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
    CameraOff,
    Crown,
    Hand,
    MicOff,
    MonitorOff,
    UserRoundX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RaisedHand } from "@/hooks/useVirtualRoomSocket";

interface ParticipantListProps {
    roomId: string;
    isHost: boolean;
    raisedHands: RaisedHand[];
    onLowerHand?: (userId: string) => void;
    onAskUnmute?: (userId: string, kind: "audio" | "video") => void;
}

function isParticipantHost(metadata?: string) {
    if (!metadata) return false;
    try {
        return JSON.parse(metadata).role === "HOST";
    } catch {
        return false;
    }
}

export function ParticipantList({
    roomId,
    isHost,
    raisedHands,
    onLowerHand,
    onAskUnmute,
}: ParticipantListProps) {
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();

    const muteTrack = async (
        participantIdentity: string,
        trackSid: string,
    ) => {
        const res = await fetch(`/api/virtual/rooms/${roomId}/mute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                participantIdentity,
                trackSid,
                muted: true,
            }),
        });
        if (!res.ok) {
            toast.error("Unable to mute this track.");
        } else {
            toast.success("Track muted.");
        }
    };

    const kickParticipant = async (participantIdentity: string, participantName?: string) => {
        if (!window.confirm(`Remove ${participantName || "this participant"} from the meeting?`)) return;
        const res = await fetch(`/api/virtual/rooms/${roomId}/kick`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantIdentity }),
        });
        if (!res.ok) {
            toast.error("Unable to remove this participant.");
        } else {
            toast.success("Participant removed from meeting.");
        }
    };

    return (
        <aside className="h-full overflow-y-auto border-l border-white/10 bg-gray-950 p-3 text-white">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Participants</h2>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                    {participants.length}
                </span>
            </div>

            {raisedHands.length > 0 && (
                <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                            <Hand className="h-3.5 w-3.5" /> Raised Hands Queue
                        </span>
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-200">
                            {raisedHands.length}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {raisedHands.map((hand, idx) => {
                            const participant = participants.find((p) => p.identity === hand.userId);
                            const name =
                                participant?.name ||
                                (hand.userId === localParticipant.identity ? "You" : "Attendee");
                            return (
                                <div
                                    key={hand.userId}
                                    className="flex items-center justify-between rounded-md bg-white/5 px-2.5 py-1.5 text-xs"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-[10px] font-bold text-blue-200">
                                            {idx + 1}
                                        </span>
                                        <span className="truncate font-medium">{name}</span>
                                    </div>
                                    {isHost && onLowerHand && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                onLowerHand(hand.userId);
                                                toast.success(`Lowered hand for ${name}`);
                                            }}
                                            className="h-6 px-2 text-[11px] text-blue-300 hover:bg-blue-500/20 hover:text-white"
                                        >
                                            Lower
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {participants.map((participant) => {
                    const isLocal = participant.identity === localParticipant.identity;
                    const participantIsHost = isParticipantHost(participant.metadata);
                    const handRaised = raisedHands.some(
                        (hand) => hand.userId === participant.identity,
                    );
                    const microphone = participant.getTrackPublication(Track.Source.Microphone);
                    const camera = participant.getTrackPublication(Track.Source.Camera);
                    const screenShare = participant.getTrackPublication(Track.Source.ScreenShare);

                    return (
                        <div
                            key={participant.identity}
                            className="rounded-lg border border-white/10 bg-white/5 p-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {participant.name || "Event attendee"}
                                        {isLocal ? " (You)" : ""}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                                        {participantIsHost && (
                                            <span className="flex items-center gap-1 text-amber-300">
                                                <Crown className="h-3 w-3" /> Host
                                            </span>
                                        )}
                                        {handRaised && (
                                            <span className="flex items-center gap-1 text-blue-300">
                                                <Hand className="h-3 w-3" /> Raised hand
                                                {isHost && onLowerHand && !isLocal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onLowerHand(participant.identity);
                                                            toast.success(`Lowered hand for ${participant.name || "attendee"}`);
                                                        }}
                                                        className="ml-1 text-[11px] text-blue-400 underline hover:text-blue-200"
                                                    >
                                                        (Lower)
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isHost && !isLocal && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {microphone && !microphone.isMuted ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => muteTrack(
                                                participant.identity,
                                                microphone.trackSid,
                                            )}
                                            className="gap-1 border-white/20 bg-transparent text-xs text-white"
                                        >
                                            <MicOff className="h-3 w-3" /> Mute
                                        </Button>
                                    ) : (
                                        onAskUnmute && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    onAskUnmute(participant.identity, "audio");
                                                    toast.success(`Sent unmute request to ${participant.name || "attendee"}.`);
                                                }}
                                                className="gap-1 border-white/20 bg-transparent text-xs text-amber-200 hover:bg-white/10"
                                            >
                                                <MicOff className="h-3 w-3 text-amber-400" /> Ask unmute
                                            </Button>
                                        )
                                    )}
                                    {camera && !camera.isMuted && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => muteTrack(
                                                participant.identity,
                                                camera.trackSid,
                                            )}
                                            className="gap-1 border-white/20 bg-transparent text-xs text-white"
                                        >
                                            <CameraOff className="h-3 w-3" /> Camera
                                        </Button>
                                    )}
                                    {screenShare && !screenShare.isMuted && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => muteTrack(
                                                participant.identity,
                                                screenShare.trackSid,
                                            )}
                                            className="gap-1 border-white/20 bg-transparent text-xs text-white"
                                        >
                                            <MonitorOff className="h-3 w-3" /> Stop share
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => kickParticipant(participant.identity, participant.name)}
                                        className="gap-1 text-xs"
                                    >
                                        <UserRoundX className="h-3 w-3" /> Kick
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
