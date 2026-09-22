"use client";

import { Fragment, useEffect, useState } from "react";
import { Plus, Users, Trash2, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JoinVirtualButton } from "@/components/virtual/JoinVirtualButton";
import { VirtualRoomListSkeleton } from "@/components/virtual/VirtualRoomListSkeleton";

export { VirtualRoomListSkeleton };

interface VirtualRoom {
    id: string;
    name: string;
    livekitRoom: string;
    isActive: boolean;
    maxParticipants: number | null;
    createdAt: string;
}

interface VirtualRoomListProps {
    eventId: string;
    isHost: boolean;
    isRegistered: boolean;
    isPaid: boolean;
    isFree: boolean;
    eventType: "ONLINE" | "HYBRID";
    startDateTime: string;
    endDateTime: string;
    initialRooms?: VirtualRoom[];
    isLoading?: boolean;
}

export function VirtualRoomList({
    eventId,
    isHost,
    isRegistered,
    isPaid,
    isFree,
    eventType,
    startDateTime,
    endDateTime,
    initialRooms = [],
    isLoading = false,
}: VirtualRoomListProps) {
    const [rooms, setRooms] = useState<VirtualRoom[]>(initialRooms);
    const [creating, setCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const startMs = new Date(startDateTime).getTime();
    const endMs = new Date(endDateTime).getTime();
    const isEventLive = nowMs >= startMs && nowMs <= endMs;

    useEffect(() => {
        const nextBoundary =
            nowMs < startMs ? startMs :
            nowMs <= endMs ? endMs + 1 :
            null;
        if (nextBoundary === null) return;

        const timeout = window.setTimeout(
            () => setNowMs(Date.now()),
            Math.min(nextBoundary - nowMs, 2_147_000_000),
        );
        return () => window.clearTimeout(timeout);
    }, [endMs, nowMs, startMs]);

    // Pick up the automatically-created room and rooms opened by another host
    // without requiring attendees to refresh the event page.
    useEffect(() => {
        if (!isEventLive) return;

        let cancelled = false;
        const refreshRooms = async () => {
            try {
                const res = await fetch(`/api/virtual/rooms?eventId=${encodeURIComponent(eventId)}`);
                if (!res.ok) return;
                const data = await res.json() as { rooms?: VirtualRoom[] };
                if (!cancelled && data.rooms) setRooms(data.rooms);
            } catch {
                // Keep the current list; the next poll can recover.
            }
        };

        void refreshRooms();
        const interval = window.setInterval(refreshRooms, 10_000);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [eventId, isEventLive]);

    const handleCreate = async () => {
        if (!newRoomName.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const res = await fetch("/api/virtual/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId, name: newRoomName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message ?? data.error ?? "Failed to create room.");
                return;
            }
            setRooms((prev) => [...prev, data.room]);
            setNewRoomName("");
            setShowForm(false);
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (roomId: string) => {
        setDeletingId(roomId);
        setError(null);
        try {
            const res = await fetch(`/api/virtual/rooms/${roomId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                setError(data.message ?? data.error ?? "Failed to close room.");
                return;
            }
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading && rooms.length === 0) {
        return <VirtualRoomListSkeleton />;
    }

    if (rooms.length === 0 && !isHost) {
        return (
            <div className="text-center py-6 text-nx-on-surface-variant bg-nx-surface-container-low rounded-lg border border-dashed border-nx-outline-variant/40">
                <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No virtual sessions open yet.</p>
                <p className="text-xs text-nx-on-surface-variant/70 mt-1">The host will start a session soon.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Room list */}
            {rooms.map((room) => (
                <Fragment key={room.id}>
                    <div
                        className="flex items-center justify-between gap-3 bg-nx-surface-container-lowest border border-nx-outline-variant/20 rounded-lg p-3 hover:border-nx-tertiary/40 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-nx-tertiary-container flex items-center justify-center shrink-0">
                                <Video className="w-4 h-4 text-nx-on-tertiary-container" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{room.name}</p>
                                {room.maxParticipants && (
                                    <p className="text-xs text-nx-on-surface-variant/70 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Max {room.maxParticipants}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-nx-success-container text-nx-on-success-container text-xs">
                                {isEventLive ? "Live" : nowMs < startMs ? "Scheduled" : "Ended"}
                            </Badge>
                            {isHost && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(room.id)}
                                    disabled={deletingId === room.id}
                                    className="text-nx-error hover:text-nx-error/80 hover:bg-nx-error-container h-7 w-7 p-0"
                                >
                                    {deletingId === room.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3 h-3" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                    <JoinVirtualButton
                        eventId={eventId}
                        roomId={room.id}
                        roomName={room.name}
                        eventType={eventType}
                        hasAccess={isRegistered || isHost}
                        isPaid={isPaid}
                        isFree={isFree || isHost}
                        startDateTime={startDateTime}
                        endDateTime={endDateTime}
                    />
                </Fragment>
            ))}

            {/* Host: create room form */}
            {isHost && isEventLive && (
                <div>
                    {showForm ? (
                        <div className="bg-nx-tertiary-container border border-nx-tertiary/30 rounded-lg p-3 space-y-2">
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                placeholder="Room name, e.g. Main Stage"
                                className="w-full text-sm bg-nx-surface-container-lowest text-nx-on-surface border border-nx-outline-variant/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-nx-tertiary"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={creating || !newRoomName.trim()}
                                    className="bg-nx-primary hover:bg-nx-primary/90 text-nx-on-primary h-8 text-xs flex-1"
                                >
                                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create Room"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => { setShowForm(false); setNewRoomName(""); }}
                                    className="h-8 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowForm(true)}
                            className="w-full border-dashed border-nx-tertiary/40 text-nx-tertiary hover:bg-nx-tertiary-container h-9 text-xs gap-1"
                        >
                            <Plus className="w-3 h-3" />
                            Add Virtual Room
                        </Button>
                    )}
                </div>
            )}

            {isHost && nowMs < startMs && (
                <p className="text-xs text-nx-on-surface-variant text-center">
                    The Main Stage will open automatically when the event starts.
                </p>
            )}

            {error && (
                <p className="text-xs text-nx-on-error-container bg-nx-error-container border border-nx-error/30 rounded-md px-3 py-2">
                    {error}
                </p>
            )}
        </div>
    );
}
