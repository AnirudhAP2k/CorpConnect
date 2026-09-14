import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Event {
	id: string;
	title: string;
	startDateTime: Date;
	endDateTime: Date;
	location: string;
	eventType: string;
	attendeeCount: number;
	maxAttendees: number | null;
	category: { label: string };
	organization?: { id: string; name: string; logo: string | null } | null;
}

interface EventRowProps {
	event: Event;
	badge?: "hosting" | "attending";
}

const typeColors: Record<string, string> = {
	ONLINE: "bg-nx-secondary-container text-nx-on-secondary-container",
	OFFLINE: "bg-nx-surface-container-high text-nx-on-surface-variant",
	HYBRID: "bg-nx-primary-container/40 text-nx-primary",
};

export default function EventRow({ event, badge }: EventRowProps) {
	const isFull = event.maxAttendees
		? event.attendeeCount >= event.maxAttendees
		: false;

	return (
		<Link
			href={`/events/${event.id}`}
			className="group flex items-center gap-4 rounded-xl p-3 font-body transition-colors hover:bg-nx-surface-container"
		>
			{/* Date block */}
			<div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-nx-primary-container/30 text-center">
				<span className="font-label text-xs font-medium leading-none text-nx-primary">
					{format(new Date(event.startDateTime), "MMM")}
				</span>
				<span className="font-headline text-lg font-bold leading-none text-nx-primary">
					{format(new Date(event.startDateTime), "d")}
				</span>
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="truncate text-sm font-medium text-nx-on-surface transition-colors group-hover:text-nx-primary">
						{event.title}
					</span>
					{badge && (
						<Badge
							variant="outline"
							className={
								badge === "hosting"
									? "border-nx-success/30 bg-nx-success-container text-nx-on-success-container"
									: "border-nx-tertiary/30 bg-nx-tertiary-container/30 text-nx-tertiary"
							}
						>
							{badge === "hosting" ? "Hosting" : "Attending"}
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-3 text-xs text-nx-on-surface-variant">
					<span className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						{format(new Date(event.startDateTime), "h:mm a")}
					</span>
					<span className="flex items-center gap-1 truncate">
						<MapPin className="h-3 w-3 flex-shrink-0" />
						<span className="truncate">{event.location}</span>
					</span>
				</div>
			</div>

			{/* Right side */}
			<div className="flex-shrink-0 text-right">
				<div
					className={`rounded-full px-2 py-0.5 font-label text-xs font-medium ${typeColors[event.eventType] ?? "bg-nx-surface-container-high text-nx-on-surface-variant"}`}
				>
					{event.eventType}
				</div>
				<div
					className={`mt-1 flex items-center gap-1 text-xs ${isFull ? "text-nx-error" : "text-nx-on-surface-variant"}`}
				>
					<Users className="h-3 w-3" />
					{event.attendeeCount}
					{event.maxAttendees ? `/${event.maxAttendees}` : ""}
				</div>
			</div>
		</Link>
	);
}
