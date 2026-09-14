import { formatMajorAmount } from "@/lib/money";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Globe, Zap } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
	event: {
		id: string;
		title: string;
		description: string;
		image: string | null;
		startDateTime: Date;
		location: string;
		eventType: "ONLINE" | "OFFLINE" | "HYBRID";
		visibility: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
		maxAttendees: number | null;
		attendeeCount: number;
		isFree: boolean;
		price: string | null;
		currency?: string | null;
		organization?: {
			id: string;
			name: string;
			logo: string | null;
		} | null;
		category: {
			id: string;
			label: string;
		};
	};
	variant?: "compact" | "full";
}

const EventCard = ({ event, variant = "full" }: EventCardProps) => {
	const getEventTypeBadge = () => {
		const types = {
			ONLINE: { label: "Online", icon: Globe },
			OFFLINE: { label: "In-Person", icon: MapPin },
			HYBRID: { label: "Hybrid", icon: Zap },
		};

		const type = types[event.eventType];
		const Icon = type.icon;

		return (
			<Badge className="flex items-center gap-1 border border-nx-outline-variant/30 bg-nx-secondary-container text-nx-on-secondary-container">
				<Icon className="w-3 h-3" />
				{type.label}
			</Badge>
		);
	};

	const getCapacityInfo = () => {
		if (!event.maxAttendees) return null;

		const spotsLeft = event.maxAttendees - event.attendeeCount;
		const percentageFull = (event.attendeeCount / event.maxAttendees) * 100;

		return (
			<div className="flex items-center gap-2 text-sm">
				<Users className="w-4 h-4 text-nx-on-surface-variant" />
				<span
					className={
						spotsLeft < 10
							? "font-medium text-nx-warning"
							: "text-nx-on-surface-variant"
					}
				>
					{event.attendeeCount}/{event.maxAttendees} spots filled
				</span>
				{spotsLeft === 0 && (
					<Badge variant="destructive" className="ml-2">
						Full
					</Badge>
				)}
			</div>
		);
	};

	return (
		<Link href={`/events/${event.id}`}>
			<article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-nx-outline-variant/30 bg-nx-surface-container-lowest shadow-nx-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
				{/* Event Image */}
				<div className="relative h-48 w-full overflow-hidden bg-nx-surface-container">
					{event.image ? (
						<Image
							src={event.image}
							alt={event.title}
							fill
							className="object-cover transition-transform group-hover:scale-105"
						/>
					) : (
						<div className="flex h-full items-center justify-center bg-nx-primary-container">
							<Calendar className="h-16 w-16 text-nx-on-primary-container" />
						</div>
					)}

					{/* Event Type Badge */}
					<div className="absolute top-3 right-3">{getEventTypeBadge()}</div>
				</div>

				{/* Event Content */}
				<div className="flex flex-1 flex-col gap-3 p-5">
					{/* Category */}
					<Badge variant="outline" className="w-fit">
						{event.category.label}
					</Badge>

					{/* Title */}
					<h3 className="line-clamp-2 font-headline text-xl font-bold text-nx-on-surface transition-colors group-hover:text-nx-primary">
						{event.title}
					</h3>

					{/* Description */}
					{variant === "full" && (
						<p className="line-clamp-2 font-body text-sm text-nx-on-surface-variant">
							{event.description}
						</p>
					)}

					{/* Date and Location */}
					<div className="flex flex-col gap-2 font-body text-sm text-nx-on-surface-variant">
						<div className="flex items-center gap-2">
							<Calendar className="w-4 h-4" />
							<span>
								{format(new Date(event.startDateTime), "MMM dd, yyyy · h:mm a")}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<MapPin className="w-4 h-4" />
							<span className="line-clamp-1">{event.location}</span>
						</div>
					</div>

					{/* Capacity Info */}
					{getCapacityInfo()}

					{/* Organization */}
					{event.organization && (
						<div className="flex items-center gap-2 border-t border-nx-outline-variant/30 pt-3">
							{event.organization.logo ? (
								<Image
									src={event.organization.logo}
									alt={event.organization.name}
									width={24}
									height={24}
									className="rounded-full"
								/>
							) : (
								<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-nx-primary-container">
									<span className="text-xs font-semibold text-nx-on-primary-container">
										{event.organization.name.charAt(0)}
									</span>
								</div>
							)}
							<span className="font-body text-sm text-nx-on-surface-variant">
								Hosted by{" "}
								<span className="font-medium text-nx-on-surface">
									{event.organization.name}
								</span>
							</span>
						</div>
					)}

					{/* Price */}
					<div className="mt-auto pt-3">
						{event.isFree ? (
							<Badge className="bg-nx-success-container text-nx-on-success-container">
								Free
							</Badge>
						) : (
							<span className="font-headline text-lg font-bold text-nx-primary">
								{formatMajorAmount(event.price ?? "0", event.currency ?? "USD")}
							</span>
						)}
					</div>
				</div>
			</article>
		</Link>
	);
};

export default EventCard;
