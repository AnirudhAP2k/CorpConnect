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
            ONLINE: { label: "Online", icon: Globe, color: "bg-blue-100 text-blue-700" },
            OFFLINE: { label: "In-Person", icon: MapPin, color: "bg-green-100 text-green-700" },
            HYBRID: { label: "Hybrid", icon: Zap, color: "bg-purple-100 text-purple-700" },
        };

        const type = types[event.eventType];
        const Icon = type.icon;

        return (
            <Badge className={`${type.color} flex items-center gap-1`}>
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
                <Users className="w-4 h-4 text-gray-500" />
                <span className={spotsLeft < 10 ? "text-orange-600 font-medium" : "text-gray-600"}>
                    {event.attendeeCount}/{event.maxAttendees} spots filled
                </span>
                {spotsLeft === 0 && (
                    <Badge variant="destructive" className="ml-2">Full</Badge>
                )}
            </div>
        );
    };

    return (
        <Link href={`/events/${event.id}`}>
            <div className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                {/* Event Image */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                    {event.image ? (
                        <Image
                            src={event.image}
                            alt={event.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                            <Calendar className="h-16 w-16 text-primary-500" />
                        </div>
                    )}

                    {/* Event Type Badge */}
                    <div className="absolute top-3 right-3">
                        {getEventTypeBadge()}
                    </div>
                </div>

                {/* Event Content */}
                <div className="flex flex-1 flex-col gap-3 p-5">
                    {/* Category */}
                    <Badge variant="outline" className="w-fit">
                        {event.category.label}
                    </Badge>

                    {/* Title */}
                    <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {event.title}
                    </h3>

                    {/* Description */}
                    {variant === "full" && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                            {event.description}
                        </p>
                    )}

                    {/* Date and Location */}
                    <div className="flex flex-col gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>{format(new Date(event.startDateTime), "MMM dd, yyyy · h:mm a")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                    </div>

                    {/* Capacity Info */}
                    {getCapacityInfo()}

                    {/* Organization */}
                    {event.organization && (
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                            {event.organization.logo ? (
                                <Image
                                    src={event.organization.logo}
                                    alt={event.organization.name}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-xs font-semibold text-primary-600">
                                        {event.organization.name.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <span className="text-sm text-gray-600">
                                Hosted by <span className="font-medium text-gray-900">{event.organization.name}</span>
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="mt-auto pt-3">
                        {event.isFree ? (
                            <Badge className="bg-green-100 text-green-700">Free</Badge>
                        ) : (
                            <span className="text-lg font-bold text-primary-600">${event.price}</span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default EventCard;
