import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Event {
    id: string;
    title: string;
    startDateTime: Date;
    endDateTime: Date;
    location: string;
    eventType: string;
    attendeeCount: number;
    maxAttendees: number | null;
    category: { label: string };
    organization?: { id: string; name: string; logo: string | null } | null;
}

interface EventRowProps {
    event: Event;
    badge?: "hosting" | "attending";
}

const typeColors: Record<string, string> = {
    ONLINE: "bg-blue-100 text-blue-700",
    OFFLINE: "bg-orange-100 text-orange-700",
    HYBRID: "bg-purple-100 text-purple-700",
};

export default function EventRow({ event, badge }: EventRowProps) {
    const isUpcoming = new Date(event.startDateTime) > new Date();
    const capacityPct = event.maxAttendees
        ? (event.attendeeCount / event.maxAttendees) * 100
        : 0;
    const isFull = event.maxAttendees ? event.attendeeCount >= event.maxAttendees : false;

    return (
        <Link
            href={`/events/${event.id}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
        >
            {/* Date block */}
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium text-primary leading-none">
                    {format(new Date(event.startDateTime), "MMM")}
                </span>
                <span className="text-lg font-bold text-primary leading-none">
                    {format(new Date(event.startDateTime), "d")}
                </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {event.title}
                    </span>
                    {badge && (
                        <Badge
                            variant="outline"
                            className={badge === "hosting" ? "text-green-700 border-green-300 bg-green-50" : "text-blue-700 border-blue-300 bg-blue-50"}
                        >
                            {badge === "hosting" ? "Hosting" : "Attending"}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.startDateTime), "h:mm a")}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </span>
                </div>
            </div>

            {/* Right side */}
            <div className="flex-shrink-0 text-right">
                <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[event.eventType] ?? "bg-gray-100 text-gray-700"}`}>
                    {event.eventType}
                </div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${isFull ? "text-red-500" : "text-muted-foreground"}`}>
                    <Users className="h-3 w-3" />
                    {event.attendeeCount}
                    {event.maxAttendees ? `/${event.maxAttendees}` : ""}
                </div>
            </div>
        </Link>
    );
}
