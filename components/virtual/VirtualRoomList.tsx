"use client";

import { useState } from "react";
import { Plus, Users, Trash2, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    initialRooms: VirtualRoom[];
}

export function VirtualRoomList({ eventId, isHost, initialRooms }: VirtualRoomListProps) {
    const [rooms, setRooms] = useState<VirtualRoom[]>(initialRooms);
    const [creating, setCreating] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                <div
                    key={room.id}
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
                        <Badge className="bg-nx-success-container text-nx-on-success-container text-xs">Live</Badge>
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
            ))}

            {/* Host: create room form */}
            {isHost && (
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

            {error && (
                <p className="text-xs text-nx-on-error-container bg-nx-error-container border border-nx-error/30 rounded-md px-3 py-2">
                    {error}
                </p>
            )}
        </div>
    );
}
