import Link from "next/link";
import { Suspense } from "react";
import OrgCard from "@/components/organizations/OrgCard";
import OrgDiscoverFilters from "@/components/organizations/OrgDiscoverFilters";
import { OrgGridSkeleton } from "@/components/OrgCardSkeleton";
import { Building2, Sparkles } from "lucide-react";
import { discoverOrganizations, discoverOrganizationsSchema, getAllIndustries } from "@/domain/organizations";
import { getPopularOrgTags } from "@/domain/tags";

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
    // Unparseable filters (e.g. a hand-edited industry ID) fall back to defaults
    // rather than crashing the page.
    const parsed = discoverOrganizationsSchema.safeParse(params);
    const input = parsed.success ? parsed.data : discoverOrganizationsSchema.parse({});

    const { organizations, total, page, totalPages } = await discoverOrganizations(input);
    const skip = (page - 1) * input.limit;

    const hasFilters = Boolean(
        input.q || input.industry || input.size || input.location || input.tags
    );

    if (organizations.length === 0) {
        return (
            <div className="bg-nx-surface-container-lowest rounded-xl border border-nx-outline-variant/60 px-5 py-12 sm:p-16 text-center">
                <Building2 className="w-12 h-12 text-nx-on-surface-variant/50 mx-auto mb-4" />
                <h3 className="text-lg font-headline font-semibold text-nx-on-surface mb-2">No organizations found</h3>
                <p className="text-nx-on-surface-variant text-sm">
                    {hasFilters ? "Try adjusting your filters." : "No organizations have been created yet."}
                </p>
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm text-nx-on-surface-variant mb-4">
                Showing <span className="font-medium text-nx-on-surface">{skip + 1}–{Math.min(skip + input.limit, total)}</span> of{" "}
                <span className="font-medium text-nx-on-surface">{total}</span> organizations
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
                            className="px-4 py-2 text-sm border border-nx-outline-variant rounded-xl bg-nx-surface-container-lowest hover:bg-nx-surface-container transition-colors"
                        >
                            ← Previous
                        </a>
                    )}
                    <span className="text-sm text-nx-on-surface-variant">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <a
                            href={`?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
                            className="px-4 py-2 text-sm border border-nx-outline-variant rounded-xl bg-nx-surface-container-lowest hover:bg-nx-surface-container transition-colors"
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
        getAllIndustries(),
        getPopularOrgTags(),
    ]);

    const hasFilters = params.q || params.industry || params.size || params.location || params.tags;

    return (
        <div className="min-h-screen bg-nx-surface font-body text-nx-on-surface">
            {/* Hero header */}
            <section className="bg-nx-primary-container/30 bg-dotted-pattern bg-cover bg-center py-10 md:py-16">
                <div className="wrapper">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-nx-primary" />
                        <span className="text-sm font-label font-medium text-nx-primary">B2B Network</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-tight text-nx-on-surface">Discover Organizations</h1>
                    <p className="text-nx-on-surface-variant mt-2 max-w-xl">
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
                        <div className="bg-nx-surface-container-lowest rounded-xl border border-nx-outline-variant/60 p-5 lg:sticky lg:top-4">
                            {/* OrgDiscoverFilters is a client component — renders the interactive controls.
                                The actual results are fetched server-side via searchParams. */}
                            <OrgDiscoverFilters industries={industries} tags={popularTags} />
                        </div>
                    </aside>

                    {/* Results — streamed via Suspense */}
                    <main className="flex-1">
                        {hasFilters && (
                            <div className="flex items-center gap-2 mb-4 text-sm text-nx-on-primary-container bg-nx-primary-container border border-nx-primary/20 rounded-xl px-4 py-2 w-fit">
                                <span>Filters active</span>
                                <Link href="/organizations/discover" className="underline hover:no-underline ml-1">
                                    Clear all
                                </Link>
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
