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
import type { RaisedHand } from "@/hooks/useVirtualRoomSocket";

interface ParticipantListProps {
    roomId: string;
    isHost: boolean;
    raisedHands: RaisedHand[];
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
            window.alert("Unable to mute this track.");
        }
    };

    const kickParticipant = async (participantIdentity: string) => {
        if (!window.confirm("Remove this participant from the meeting?")) return;
        const res = await fetch(`/api/virtual/rooms/${roomId}/kick`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantIdentity }),
        });
        if (!res.ok) {
            window.alert("Unable to remove this participant.");
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
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isHost && !isLocal && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {microphone && !microphone.isMuted && (
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
                                        onClick={() => kickParticipant(participant.identity)}
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
