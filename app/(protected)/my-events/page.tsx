import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserParticipations } from "@/data/event-participation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Building2, Clock, CheckCircle2, XCircle, Ticket } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import CancelParticipationButton from "@/components/shared/CancelParticipationButton";

type Tab = "upcoming" | "past" | "cancelled";

interface MyEventsPageProps {
    searchParams: { tab?: Tab };
}

const statusConfig = {
    REGISTERED: { label: "Registered", icon: Ticket, className: "bg-blue-100 text-blue-700" },
    ATTENDED: { label: "Attended", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", icon: XCircle, className: "bg-red-100 text-red-700" },
    WAITLISTED: { label: "Waitlisted", icon: Clock, className: "bg-yellow-100 text-yellow-700" },
};

export default async function MyEventsPage({ searchParams }: MyEventsPageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/my-events");
    }

    const sp = await searchParams;
    const activeTab: Tab = sp.tab || "upcoming";

    // Fetch all participations
    const allParticipations = await getUserParticipations(session.user.id);

    const now = new Date();

    const upcoming = allParticipations.filter(
        (p) =>
            (p.status === "REGISTERED" || p.status === "WAITLISTED") &&
            new Date(p.event.startDateTime) >= now
    );

    const past = allParticipations.filter(
        (p) =>
            (p.status === "REGISTERED" || p.status === "ATTENDED") &&
            new Date(p.event.startDateTime) < now
    );

    const cancelled = allParticipations.filter((p) => p.status === "CANCELLED");

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: "upcoming", label: "Upcoming", count: upcoming.length },
        { key: "past", label: "Past", count: past.length },
        { key: "cancelled", label: "Cancelled", count: cancelled.length },
    ];

    const activeList =
        activeTab === "upcoming" ? upcoming : activeTab === "past" ? past : cancelled;

    return (
        <div className="wrapper py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold">My Events</h1>
                <p className="text-gray-600 mt-1">Track your event registrations and history</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 mb-6">
                {tabs.map((tab) => (
                    <Link key={tab.key} href={`/my-events?tab=${tab.key}`}>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                                    ? "border-primary-600 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span
                                    className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key
                                            ? "bg-primary-100 text-primary-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    </Link>
                ))}
            </div>

            {/* Event list */}
            {activeList.length === 0 ? (
                <div className="text-center py-16">
                    <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No {activeTab} events
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {activeTab === "upcoming"
                            ? "You haven't registered for any upcoming events yet."
                            : activeTab === "past"
                                ? "You haven't attended any events yet."
                                : "You haven't cancelled any registrations."}
                    </p>
                    {activeTab === "upcoming" && (
                        <Link href="/events">
                            <Button>Browse Events</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {activeList.map((participation) => {
                        const event = participation.event;
                        const status = statusConfig[participation.status as keyof typeof statusConfig];
                        const StatusIcon = status.icon;
                        const isUpcoming = new Date(event.startDateTime) >= now;

                        return (
                            <div
                                key={participation.id}
                                className="bg-white rounded-lg border border-gray-200 p-5 flex gap-5 hover:shadow-sm transition-shadow"
                            >
                                {/* Event Image */}
                                <div className="flex-shrink-0">
                                    {event.image ? (
                                        <Image
                                            src={event.image}
                                            alt={event.title}
                                            width={96}
                                            height={96}
                                            className="w-24 h-24 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-lg bg-primary-50 flex items-center justify-center">
                                            <Calendar className="w-8 h-8 text-primary-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Event Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <Link href={`/events/${event.id}`}>
                                                <h3 className="font-semibold text-lg hover:text-primary-600 transition-colors line-clamp-1">
                                                    {event.title}
                                                </h3>
                                            </Link>
                                            {event.organization && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-sm text-gray-500">
                                                        {event.organization.name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <Badge className={`${status.className} flex items-center gap-1 flex-shrink-0`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {status.label}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" />
                                            <span>{format(new Date(event.startDateTime), "MMM d, yyyy · h:mm a")}</span>
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                <span className="line-clamp-1">{event.location}</span>
                                            </div>
                                        )}
                                        {participation.organization && (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="w-4 h-4" />
                                                <span>via {participation.organization.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4">
                                        <Link href={`/events/${event.id}`}>
                                            <Button variant="outline" size="sm">
                                                View Event
                                            </Button>
                                        </Link>
                                        {isUpcoming && participation.status === "REGISTERED" && (
                                            <CancelParticipationButton
                                                eventId={event.id}
                                                eventTitle={event.title}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
