"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import EventCalendar, { CalendarEvent } from "@/components/shared/EventCalendar";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface GroupEvent {
    id: string;
    createdAt: Date;
    event: {
        id: string;
        title: string;
        startDateTime: Date;
        location: string;
        image: string | null;
        category: { label: string };
        organization: { id: string; name: string; logo: string | null } | null;
    };
    addedByOrg: { id: string; name: string };
}

export default function GroupCalendar({
    groupId,
    initialEvents,
}: {
    groupId: string;
    initialEvents: GroupEvent[];
}) {
    const [events, setEvents] = useState<GroupEvent[]>(initialEvents);
    const [eventIdToShare, setEventIdToShare] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    // ─── Event sharing handler ───────────────────────────────────────────────
    async function handleShareEvent(e: React.FormEvent) {
        e.preventDefault();
        if (!eventIdToShare.trim()) return;

        setIsSharing(true);
        try {
            const res = await axios.post(`/api/groups/${groupId}/events`, {
                eventId: eventIdToShare.trim(),
            });
            setEvents(
                [...events, res.data].sort(
                    (a, b) =>
                        new Date(a.event.startDateTime).getTime() -
                        new Date(b.event.startDateTime).getTime()
                )
            );
            setEventIdToShare("");
            toast.success("Event shared to calendar successfully!");
        } catch (error: any) {
            toast.error(
                error.response?.data?.error ||
                    "Failed to share event. Make sure the Event ID is correct."
            );
        } finally {
            setIsSharing(false);
        }
    }

    // Map group specific events to generic CalendarEvent format
    const calendarEvents: CalendarEvent[] = events.map((ge) => ({
        id: ge.event.id,
        title: ge.event.title,
        startDateTime: ge.event.startDateTime,
        location: ge.event.location,
        image: ge.event.image,
        category: ge.event.category.label,
        organizerName: ge.event.organization?.name || "Independent Organizer",
        sharedByName: ge.addedByOrg.name,
    }));

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Share Event Form */}
            <form
                onSubmit={handleShareEvent}
                className="bg-card p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row gap-3 items-end sm:items-center"
            >
                <div className="flex-1 w-full space-y-1">
                    <label className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        Share Event by ID
                    </label>
                    <Input
                        placeholder="Paste Event UUID here..."
                        value={eventIdToShare}
                        onChange={(e) => setEventIdToShare(e.target.value)}
                        required
                        className="bg-background border-muted"
                    />
                </div>
                <Button
                    type="submit"
                    disabled={!eventIdToShare.trim() || isSharing}
                    className="w-full sm:w-auto shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {isSharing ? "Sharing..." : "Share to Calendar"}
                </Button>
            </form>

            {/* Reusable Event Calendar */}
            <EventCalendar events={calendarEvents} />
        </div>
    );
}
