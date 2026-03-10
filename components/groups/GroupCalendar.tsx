"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building2, Plus, ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";

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

export default function GroupCalendar({ groupId, initialEvents }: { groupId: string, initialEvents: GroupEvent[] }) {
    const [events, setEvents] = useState<GroupEvent[]>(initialEvents);
    const [eventIdToShare, setEventIdToShare] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    async function handleShareEvent(e: React.FormEvent) {
        e.preventDefault();
        if (!eventIdToShare.trim()) return;

        setIsSharing(true);
        try {
            const res = await axios.post(`/api/groups/${groupId}/events`, { eventId: eventIdToShare.trim() });
            setEvents([...events, res.data].sort((a, b) => new Date(a.event.startDateTime).getTime() - new Date(b.event.startDateTime).getTime()));
            setEventIdToShare("");
            toast.success("Event shared to calendar");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Something went wrong. Make sure the Event ID is correct.");
        } finally {
            setIsSharing(false);
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Share Event Form */}
            <form onSubmit={handleShareEvent} className="bg-card p-4 rounded-lg border flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-sm font-medium">Share an Event</label>
                    <Input
                        placeholder="Paste Event ID here..."
                        value={eventIdToShare}
                        onChange={(e) => setEventIdToShare(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" disabled={!eventIdToShare.trim() || isSharing} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    {isSharing ? "Sharing..." : "Share to Calendar"}
                </Button>
            </form>

            {/* Shared Events Grid */}
            {events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                    <Calendar className="w-8 h-8 opacity-50 mx-auto mb-2" />
                    No events on the shared calendar yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((ge) => (
                        <div key={ge.id} className="bg-card rounded-lg border overflow-hidden flex flex-col transition-all hover:border-primary/50">
                            <div className="h-32 bg-muted relative">
                                {ge.event.image ? (
                                    <img src={ge.event.image} alt={ge.event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                        <Calendar className="w-8 h-8 text-primary/40" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                                        {new Date(ge.event.startDateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Badge>
                                </div>
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <Badge variant="outline" className="w-fit mb-2 text-xs">{ge.event.category.label}</Badge>
                                <h3 className="font-semibold text-lg line-clamp-1 mb-1">{ge.event.title}</h3>

                                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1.5 line-clamp-1">
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{ge.event.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 line-clamp-1">
                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{ge.event.organization?.name || 'Independent Organizer'}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Shared by {ge.addedByOrg.name}
                                    </p>
                                    <Link href={`/events/${ge.event.id}`} className="text-primary text-sm font-medium hover:underline flex items-center">
                                        View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
