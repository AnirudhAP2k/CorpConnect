import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import EventCard from "@/components/shared/EventCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllEvents } from "@/data/events";
import { getAllCategories } from "@/actions/category.actions";
import { Category } from "@prisma/client";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

interface EventsPageProps {
    searchParams: {
        category?: string;
        search?: string;
        type?: string;
        fromDate?: string;
        toDate?: string;
    };
}

const EventsPage = async ({ searchParams }: EventsPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    const params = await searchParams;

    const where: any = {
        visibility: "PUBLIC",
    };

    let filterCleared = false;

    if (params.fromDate || params.toDate) {
        where.startDateTime = {};
        if (params.fromDate) {
            where.startDateTime.gte = new Date(params.fromDate);
        }
        if (params.toDate) {
            where.startDateTime.lte = new Date(params.toDate);
        }
    } else {
        where.startDateTime = {
            gte: new Date(),
        };
        filterCleared = true;
    }

    if (params.category) {
        where.categoryId = params.category;
    }

    if (params.type) {
        where.eventType = params.type;
    }

    if (params.search) {
        where.OR = [
            { title: { contains: params.search, mode: "insensitive" } },
            { description: { contains: params.search, mode: "insensitive" } },
        ];
    }

    const events = await getAllEvents(where, 20);

    const categories = await getAllCategories();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-10 md:py-16">
                <div className="wrapper flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="h1-bold">Discover Events</h1>
                        <p className="text-gray-600 mt-2">
                            Find and join exciting B2B networking events
                        </p>
                    </div>
                    {userId && (
                        <Link href="/events/create">
                            <Button size="lg" className="gap-2">
                                <Plus className="w-5 h-5" />
                                Create Event
                            </Button>
                        </Link>
                    )}
                </div>
            </section>

            {/* Filters and Events */}
            <div className="wrapper my-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-4">
                            <h3 className="font-bold text-lg mb-4">Filters</h3>

                            {/* Date Range Filter */}
                            <DateRangeFilter clearRange={filterCleared} />

                            {/* Search */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Search
                                </label>
                                <form action="/events" method="get">
                                    <input
                                        type="text"
                                        name="search"
                                        placeholder="Search events..."
                                        defaultValue={params.search}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    {params.category && (
                                        <input type="hidden" name="category" value={params.category} />
                                    )}
                                    {params.type && (
                                        <input type="hidden" name="type" value={params.type} />
                                    )}
                                    {params.fromDate && (
                                        <input type="hidden" name="fromDate" value={params.fromDate} />
                                    )}
                                    {params.toDate && (
                                        <input type="hidden" name="toDate" value={params.toDate} />
                                    )}
                                    <Button type="submit" className="w-full mt-2" size="sm">
                                        Search
                                    </Button>
                                </form>
                            </div>

                            {/* Category Filter */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Category
                                </label>
                                <div className="flex flex-col gap-2">
                                    <Link
                                        href="/events"
                                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${!params.category
                                            ? "bg-primary-100 text-primary-700 font-medium"
                                            : "hover:bg-gray-100"
                                            }`}
                                    >
                                        All Categories
                                    </Link>
                                    {categories.map((category: Category) => (
                                        <Link
                                            key={category.id}
                                            href={`/events?category=${category.id}${params.search ? `&search=${params.search}` : ""
                                                }${params.type ? `&type=${params.type}` : ""}${params.fromDate ? `&fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
                                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${params.category === category.id
                                                ? "bg-primary-100 text-primary-700 font-medium"
                                                : "hover:bg-gray-100"
                                                }`}
                                        >
                                            {category.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Event Type Filter */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Event Type
                                </label>
                                <div className="flex flex-col gap-2">
                                    <Link
                                        href={`/events${params.category ? `?category=${params.category}` : ""}${params.search ? `${params.category ? "&" : "?"}search=${params.search}` : ""
                                            }${params.fromDate ? `${params.category || params.search ? "&" : "?"}fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
                                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${!params.type
                                            ? "bg-primary-100 text-primary-700 font-medium"
                                            : "hover:bg-gray-100"
                                            }`}
                                    >
                                        All Types
                                    </Link>
                                    {["ONLINE", "OFFLINE", "HYBRID"].map((type) => (
                                        <Link
                                            key={type}
                                            href={`/events?type=${type}${params.category ? `&category=${params.category}` : ""
                                                }${params.search ? `&search=${params.search}` : ""}${params.fromDate ? `&fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
                                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${params.type === type
                                                ? "bg-primary-100 text-primary-700 font-medium"
                                                : "hover:bg-gray-100"
                                                }`}
                                        >
                                            {type === "ONLINE" ? "Online" : type === "OFFLINE" ? "In-Person" : "Hybrid"}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {(params.category || params.search || params.type || params.fromDate || params.toDate) && (
                                <Link href="/events">
                                    <Button variant="outline" className="w-full" size="sm">
                                        Clear All Filters
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </aside>

                    {/* Events Grid */}
                    <div className="flex-1">
                        {events.length === 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    No events found
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Try adjusting your filters or search query
                                </p>
                                <Link href="/events">
                                    <Button variant="outline">Clear Filters</Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 text-sm text-gray-600">
                                    Found {events.length} event{events.length !== 1 ? "s" : ""}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {events.map((event) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventsPage;
