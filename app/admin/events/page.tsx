import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { getAdminEventsList } from "@/data/dashboard";
import { format } from "date-fns";
import Link from "next/link";

interface AdminEventsPageProps {
    searchParams: Promise<{ search?: string; page?: string }>;
}

const typeColors: Record<string, string> = {
    ONLINE: "bg-blue-100 text-blue-700",
    OFFLINE: "bg-orange-100 text-orange-700",
    HYBRID: "bg-purple-100 text-purple-700",
};

const visibilityColors: Record<string, string> = {
    PUBLIC: "bg-green-100 text-green-700",
    PRIVATE: "bg-gray-100 text-gray-700",
    INVITE_ONLY: "bg-yellow-100 text-yellow-700",
};

export default async function AdminEventsPage({ searchParams }: AdminEventsPageProps) {
    const { search, page } = await searchParams;
    const pageNum = parseInt(page ?? "1", 10);
    const take = 20;
    const skip = (pageNum - 1) * take;

    const { events, total } = await getAdminEventsList(skip, take, search);
    const totalPages = Math.ceil(total / take);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Events</h1>
                    <p className="text-muted-foreground text-sm mt-1">{total.toLocaleString()} events across the platform</p>
                </div>
                <form method="get" className="flex gap-2">
                    <input
                        name="search"
                        type="text"
                        defaultValue={search}
                        placeholder="Search events..."
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button type="submit" className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                        Search
                    </button>
                </form>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y divide-muted/50">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="font-medium">No events found</p>
                            </div>
                        ) : events.map((event) => (
                            <div key={event.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                                {/* Date block */}
                                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-medium text-primary leading-none">
                                        {format(new Date(event.startDateTime), "MMM")}
                                    </span>
                                    <span className="text-lg font-bold text-primary leading-none">
                                        {format(new Date(event.startDateTime), "d")}
                                    </span>
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Link href={`/events/${event.id}`} className="font-medium text-sm hover:text-primary transition-colors truncate">
                                            {event.title}
                                        </Link>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${typeColors[event.eventType] ?? ""}`}>
                                            {event.eventType}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${visibilityColors[event.visibility] ?? ""}`}>
                                            {event.visibility.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {event.organization && (
                                            <Link href={`/organizations/${event.organization.id}`} className="hover:text-primary transition-colors">
                                                {event.organization.name}
                                            </Link>
                                        )}
                                        <span>{event.category.label}</span>
                                    </div>
                                </div>
                                {/* Right */}
                                <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {event._count.participations}
                                        {event.maxAttendees ? `/${event.maxAttendees}` : ""}
                                    </div>
                                    <div>{format(new Date(event.startDateTime), "MMM d, yyyy")}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Showing {skip + 1}–{Math.min(skip + take, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                        {pageNum > 1 && (
                            <Link href={`?page=${pageNum - 1}${search ? `&search=${search}` : ""}`}
                                className="px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
                                ← Previous
                            </Link>
                        )}
                        {pageNum < totalPages && (
                            <Link href={`?page=${pageNum + 1}${search ? `&search=${search}` : ""}`}
                                className="px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors">
                                Next →
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
