import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon: LucideIcon;
	trend?: {
		value: number; // positive = up, negative = down
		label: string; // e.g. "vs last month"
	};
	className?: string;
	iconClassName?: string;
}

export default function StatCard({
	title,
	value,
	description,
	icon: Icon,
	trend,
	className,
	iconClassName,
}: StatCardProps) {
	return (
		<Card
			className={cn(
				"relative overflow-hidden rounded-2xl border-nx-outline-variant/60 bg-nx-surface-container-lowest font-body",
				className,
			)}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-label text-sm font-medium text-nx-on-surface-variant">
					{title}
				</CardTitle>
				<div
					className={cn(
						"rounded-xl p-2",
						iconClassName ?? "bg-nx-primary-container/30",
					)}
				>
					<Icon className="h-4 w-4 text-nx-primary" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="font-headline text-2xl font-bold tracking-tight text-nx-on-surface">
					{value}
				</div>
				{description && (
					<p className="mt-1 text-xs text-nx-on-surface-variant">
						{description}
					</p>
				)}
				{trend && (
					<div
						className={cn(
							"mt-2 flex items-center gap-1 text-xs font-medium",
							trend.value >= 0 ? "text-nx-success" : "text-nx-error",
						)}
					>
						<span>{trend.value >= 0 ? "↑" : "↓"}</span>
						<span>
							{Math.abs(trend.value)}% {trend.label}
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
