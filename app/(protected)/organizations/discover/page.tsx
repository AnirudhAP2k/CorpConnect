import { prisma } from "@/lib/db";
import { Suspense } from "react";
import OrgCard from "@/components/organizations/OrgCard";
import OrgDiscoverFilters from "@/components/organizations/OrgDiscoverFilters";
import { OrgGridSkeleton } from "@/components/OrgCardSkeleton";
import { Building2, Sparkles } from "lucide-react";

interface SearchParams {
    q?: string;
    industry?: string;
    size?: string;
    location?: string;
    tags?: string;
    page?: string;
}

interface OrgsDiscoverPageProps {
    searchParams: Promise<SearchParams>;
}

// ISR: revalidate the filter options (industries, tags) every 5 minutes
// The org list itself is SSR (dynamic, revalidated on every request)
export const revalidate = 300;

// ─── Async server component that streams org results ─────────────────────────
async function OrgResults({ params }: { params: SearchParams }) {
    const q = params.q ?? "";
    const industry = params.industry ?? "";
    const size = params.size ?? "";
    const location = params.location ?? "";
    const tagIds = params.tags ? params.tags.split(",").filter(Boolean) : [];
    const page = Math.max(1, parseInt(params.page ?? "1", 10));
    const limit = 24;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }
    if (industry) where.industryId = industry;
    if (size) where.size = size;
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (tagIds.length > 0) {
        where.orgTags = { some: { tagId: { in: tagIds } } };
    }

    const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { isVerified: "desc" },
                { events: { _count: "desc" } },
                { createdAt: "desc" },
            ],
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                location: true,
                size: true,
                isVerified: true,
                website: true,
                industry: { select: { id: true, label: true } },
                orgTags: {
                    take: 5,
                    select: { tag: { select: { id: true, label: true } } },
                },
                _count: { select: { members: true, events: true } },
            },
        }),
        prisma.organization.count({ where }),
    ]);

    const hasFilters = q || industry || size || location || tagIds.length > 0;
    const totalPages = Math.ceil(total / limit);

    if (organizations.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No organizations found</h3>
                <p className="text-gray-500 text-sm">
                    {hasFilters ? "Try adjusting your filters." : "No organizations have been created yet."}
                </p>
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm text-gray-500 mb-4">
                Showing <span className="font-medium text-gray-800">{skip + 1}–{Math.min(skip + limit, total)}</span> of{" "}
                <span className="font-medium text-gray-800">{total}</span> organizations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {organizations.map((org) => (
                    <OrgCard key={org.id} org={org} />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                    {page > 1 && (
                        <a
                            href={`?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
                            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            ← Previous
                        </a>
                    )}
                    <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <a
                            href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Next →
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main page (SSR Server Component) ────────────────────────────────────────
export default async function OrgsDiscoverPage({ searchParams }: OrgsDiscoverPageProps) {
    const params = await searchParams;

    // These are relatively static — cached by the ISR revalidate above
    const [industries, popularTags] = await Promise.all([
        prisma.industry.findMany({ orderBy: { label: "asc" }, select: { id: true, label: true } }),
        prisma.tag.findMany({
            orderBy: { orgTags: { _count: "desc" } },
            take: 30,
            select: { id: true, label: true },
        }),
    ]);

    const hasFilters = params.q || params.industry || params.size || params.location || params.tags;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero header */}
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-10 md:py-16">
                <div className="wrapper">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-primary">B2B Network</span>
                    </div>
                    <h1 className="h1-bold">Discover Organizations</h1>
                    <p className="text-gray-600 mt-2 max-w-xl">
                        Find and connect with organizations across industries. Build partnerships,
                        attend shared events, and grow your professional network.
                    </p>
                </div>
            </section>

            {/* Body */}
            <div className="wrapper my-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filter sidebar */}
                    <aside className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4">
                            {/* OrgDiscoverFilters is a client component — renders the interactive controls.
                                The actual results are fetched server-side via searchParams. */}
                            <OrgDiscoverFilters industries={industries} tags={popularTags} />
                        </div>
                    </aside>

                    {/* Results — streamed via Suspense */}
                    <main className="flex-1">
                        {hasFilters && (
                            <div className="flex items-center gap-2 mb-4 text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 w-fit">
                                <span>Filters active</span>
                                <a href="/organizations/discover" className="underline hover:no-underline ml-1">
                                    Clear all
                                </a>
                            </div>
                        )}

                        {/* Suspense boundary: shows skeleton while OrgResults fetches from DB */}
                        <Suspense key={JSON.stringify(params)} fallback={<OrgGridSkeleton />}>
                            <OrgResults params={params} />
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}
