import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import EventCard from "@/components/shared/EventCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAttendingEvents, getHostEvents, getPastEvents } from "@/data/events";

interface OrganizationEventsPageProps {
    params: {
        id: string;
    };
    searchParams: {
        tab?: string;
    };
}

const OrganizationEventsPage = async ({ params, searchParams }: OrganizationEventsPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    const activeTab = searchParams.tab || "hosted";
    const data = await params;
    const { id } = data;

    // Fetch organization
    const organization = await prisma.organization.findUnique({
        where: { id: id },
        include: {
            members: userId ? {
                where: { userId },
            } : false,
        },
    });

    if (!organization) {
        notFound();
    }

    const isMember = userId && organization.members && organization.members.length > 0;
    const isAdmin = isMember && (organization.members[0].role === "OWNER" || organization.members[0].role === "ADMIN");

    let events: any[] = [];

    if (activeTab === "hosted") {
        // Events hosted by this organization
        events = await getHostEvents(id);
    } else if (activeTab === "attending") {
        // Events organization members are attending
        events = await getAttendingEvents(id);
    } else if (activeTab === "past") {
        // Past events (hosted or attended)
        events = await getPastEvents(id);
    }

    const tabs = [
        { id: "hosted", label: "Hosted Events", count: events.length },
        { id: "attending", label: "Attending", count: 0 },
        { id: "past", label: "Past Events", count: 0 },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-10 md:py-16">
                <div className="wrapper flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="h1-bold">{organization.name} Events</h1>
                        <p className="text-gray-600 mt-2">
                            Manage and view all organization events
                        </p>
                    </div>
                    {isAdmin && (
                        <Link href="/events/create">
                            <Button size="lg" className="gap-2">
                                <Plus className="w-5 h-5" />
                                Create Event
                            </Button>
                        </Link>
                    )}
                </div>
            </section>

            {/* Tabs and Content */}
            <div className="wrapper my-8">
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="flex gap-8">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.id}
                                href={`/organizations/${params.id}/events?tab=${tab.id}`}
                                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? "border-primary-600 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.id && events.length > 0 && (
                                    <span className="ml-2 bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full text-xs">
                                        {events.length}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Events Grid */}
                {events.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {activeTab === "hosted" && "No hosted events"}
                            {activeTab === "attending" && "Not attending any events"}
                            {activeTab === "past" && "No past events"}
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {activeTab === "hosted" && "Create your first event to get started"}
                            {activeTab === "attending" && "Join events to see them here"}
                            {activeTab === "past" && "Past events will appear here"}
                        </p>
                        {activeTab === "hosted" && isAdmin && (
                            <Link href="/events/create">
                                <Button className="gap-2">
                                    <Plus className="w-5 h-5" />
                                    Create Event
                                </Button>
                            </Link>
                        )}
                        {activeTab === "attending" && (
                            <Link href="/events">
                                <Button variant="outline">Browse Events</Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationEventsPage;
