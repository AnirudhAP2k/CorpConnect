import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder for OrgCard — used as Suspense fallback
 * on the /organizations/discover page while results stream in.
 */
const OrgCardSkeleton = () => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* accent bar */}
            <div className="h-1.5 bg-gray-200" />
            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
                {/* Description */}
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-4/5 mb-4" />
                {/* Tags */}
                <div className="flex gap-2 mb-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                {/* Footer */}
                <Skeleton className="h-px w-full mb-3" />
                <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
        </div>
    );
};

/**
 * Full grid of OrgCardSkeleton — drop in as a Suspense fallback.
 * @param count Number of skeleton cards to show (default 6)
 */
export const OrgGridSkeleton = ({ count = 6 }: { count?: number }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
            <OrgCardSkeleton key={i} />
        ))}
    </div>
);

export default OrgCardSkeleton;
