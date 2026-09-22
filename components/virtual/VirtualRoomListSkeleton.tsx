import { Skeleton } from "@/components/ui/skeleton";

export const VirtualRoomListSkeleton = () => {
	return (
		<div className="space-y-3" role="status" aria-label="Loading virtual rooms">
			{[1, 2].map((i) => (
				<div key={i} className="space-y-2">
					<div className="flex items-center justify-between gap-3 bg-nx-surface-container-lowest border border-nx-outline-variant/20 rounded-lg p-3">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<Skeleton className="w-8 h-8 rounded-full shrink-0" />
							<div className="min-w-0 flex-1 space-y-1.5">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<Skeleton className="h-5 w-12 rounded-full" />
						</div>
					</div>
					<Skeleton className="h-9 w-full rounded-md" />
				</div>
			))}
		</div>
	);
};
