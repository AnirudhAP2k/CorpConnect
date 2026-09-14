import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import EventCard from "@/components/shared/EventCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getEvents } from "@/domain/events";
import { getAllCategories } from "@/actions/category.actions";
import { Category } from "@prisma/client";
import DateRangeFilter from "@/components/shared/DateRangeFilter";

interface EventsPageProps {
	searchParams: Promise<{
		category?: string;
		search?: string;
		type?: string;
		fromDate?: string;
		toDate?: string;
	}>;
}

const EventsPage = async ({ searchParams }: EventsPageProps) => {
	const session = await auth();
	const userId = session?.user?.id;

	const params = await searchParams;

	const filterCleared = !params.fromDate && !params.toDate;

	const { events } = await getEvents({
		q: params.search ?? "",
		categoryId: params.category,
		visibility: "PUBLIC",
		upcoming: filterCleared,
		page: 1,
		limit: 60,
	});

	const categories = await getAllCategories();

	return (
		<div className="min-h-screen bg-nx-surface text-nx-on-surface">
			{/* Header */}
			<section className="bg-nx-surface-container-low py-10 md:py-16">
				<div className="wrapper flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
					<div>
						<p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-nx-on-surface-variant">
							Events
						</p>
						<h1 className="mt-2 font-headline text-3xl font-bold tracking-tight sm:text-4xl">
							Discover Events
						</h1>
						<p className="mt-2 font-body text-nx-on-surface-variant">
							Find and join exciting B2B networking events
						</p>
					</div>
					{userId && (
						<Link href="/events/create" className="w-full sm:w-auto">
							<Button size="lg" className="w-full gap-2 rounded-xl sm:w-auto">
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
						<div className="sticky top-20 rounded-2xl border border-nx-outline-variant/30 bg-nx-surface-container-lowest p-5 shadow-nx-card">
							<h2 className="mb-4 font-headline text-lg font-bold">Filters</h2>

							{/* Date Range Filter */}
							<DateRangeFilter />

							{/* Search */}
							<div className="mb-6">
								<label className="mb-2 block font-label text-sm font-medium text-nx-on-surface">
									Search
								</label>
								<form action="/events" method="get">
									<input
										type="text"
										name="search"
										placeholder="Search events..."
										defaultValue={params.search}
										className="w-full rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-3 py-2 font-body text-nx-on-surface outline-none placeholder:text-nx-on-surface-variant/60 focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/15"
									/>
									{params.category && (
										<input
											type="hidden"
											name="category"
											value={params.category}
										/>
									)}
									{params.type && (
										<input type="hidden" name="type" value={params.type} />
									)}
									{params.fromDate && (
										<input
											type="hidden"
											name="fromDate"
											value={params.fromDate}
										/>
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
								<label className="mb-2 block font-label text-sm font-medium text-nx-on-surface">
									Category
								</label>
								<div className="flex flex-col gap-2">
									<Link
										href="/events"
										className={`rounded-xl px-3 py-2 font-body text-sm transition-colors ${
											!params.category
												? "bg-nx-primary-container text-nx-on-primary-container font-medium"
												: "text-nx-on-surface-variant hover:bg-nx-surface-container"
										}`}
									>
										All Categories
									</Link>
									{categories.map((category: Category) => (
										<Link
											key={category.id}
											href={`/events?category=${category.id}${
												params.search ? `&search=${params.search}` : ""
											}${params.type ? `&type=${params.type}` : ""}${params.fromDate ? `&fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
											className={`rounded-xl px-3 py-2 font-body text-sm transition-colors ${
												params.category === category.id
													? "bg-nx-primary-container text-nx-on-primary-container font-medium"
													: "text-nx-on-surface-variant hover:bg-nx-surface-container"
											}`}
										>
											{category.label}
										</Link>
									))}
								</div>
							</div>

							{/* Event Type Filter */}
							<div className="mb-6">
								<label className="mb-2 block font-label text-sm font-medium text-nx-on-surface">
									Event Type
								</label>
								<div className="flex flex-col gap-2">
									<Link
										href={`/events${params.category ? `?category=${params.category}` : ""}${
											params.search
												? `${params.category ? "&" : "?"}search=${params.search}`
												: ""
										}${params.fromDate ? `${params.category || params.search ? "&" : "?"}fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
										className={`rounded-xl px-3 py-2 font-body text-sm transition-colors ${
											!params.type
												? "bg-nx-primary-container text-nx-on-primary-container font-medium"
												: "text-nx-on-surface-variant hover:bg-nx-surface-container"
										}`}
									>
										All Types
									</Link>
									{["ONLINE", "OFFLINE", "HYBRID"].map((type) => (
										<Link
											key={type}
											href={`/events?type=${type}${
												params.category ? `&category=${params.category}` : ""
											}${params.search ? `&search=${params.search}` : ""}${params.fromDate ? `&fromDate=${params.fromDate}` : ""}${params.toDate ? `&toDate=${params.toDate}` : ""}`}
											className={`rounded-xl px-3 py-2 font-body text-sm transition-colors ${
												params.type === type
													? "bg-nx-primary-container text-nx-on-primary-container font-medium"
													: "text-nx-on-surface-variant hover:bg-nx-surface-container"
											}`}
										>
											{type === "ONLINE"
												? "Online"
												: type === "OFFLINE"
													? "In-Person"
													: "Hybrid"}
										</Link>
									))}
								</div>
							</div>

							{/* Clear Filters */}
							{(params.category ||
								params.search ||
								params.type ||
								params.fromDate ||
								params.toDate) && (
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
							<div className="rounded-2xl border border-nx-outline-variant/30 bg-nx-surface-container-lowest p-8 text-center shadow-nx-card sm:p-12">
								<h3 className="mb-2 font-headline text-xl font-semibold text-nx-on-surface">
									No events found
								</h3>
								<p className="mb-6 font-body text-nx-on-surface-variant">
									Try adjusting your filters or search query
								</p>
								<Link href="/events">
									<Button variant="outline">Clear Filters</Button>
								</Link>
							</div>
						) : (
							<>
								<div className="mb-4 font-label text-sm text-nx-on-surface-variant">
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
