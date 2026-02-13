import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Globe, Zap, Building2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { getEventById } from "@/data/events";

interface EventDetailPageProps {
    params: {
        id: string;
    };
}

const EventDetailPage = async ({ params }: EventDetailPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    const data = await params;
    const { id } = data;

    const event = await getEventById(id);

    if (!event) {
        notFound();
    }

    // Check visibility permissions
    if (event.visibility === "PRIVATE") {
        if (!userId) {
            redirect(`/login?callbackUrl=/events/${params.id}`);
        }

        // Check if user is member of the organization
        const isMember = event.organization?.members.some((m) => m.userId === userId);
        if (!isMember) {
            return (
                <div className="wrapper min-h-screen flex items-center justify-center">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
                        <h2 className="text-2xl font-bold text-red-800 mb-2">Private Event</h2>
                        <p className="text-red-600">
                            This event is only visible to members of {event.organization?.name}.
                        </p>
                    </div>
                </div>
            );
        }
    }

    if (event.visibility === "INVITE_ONLY") {
        if (!userId) {
            redirect(`/login?callbackUrl=/events/${params.id}`);
        }

        // Check if user is invited (has participation record)
        const isInvited = event.participations.some((p) => p.userId === userId);
        const isMember = event.organization?.members.some((m) => m.userId === userId);

        if (!isInvited && !isMember) {
            return (
                <div className="wrapper min-h-screen flex items-center justify-center">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center max-w-md">
                        <h2 className="text-2xl font-bold text-orange-800 mb-2">Invitation Required</h2>
                        <p className="text-orange-600">
                            This event is invite-only. Please contact the organizer for an invitation.
                        </p>
                    </div>
                </div>
            );
        }
    }

    // Check if user is already participating
    const userParticipation = userId
        ? event.participations.find((p) => p.userId === userId)
        : null;

    // Check if event is full
    const isFull = event.maxAttendees ? event.attendeeCount >= event.maxAttendees : false;

    // Check if user is host
    const isHost = userId && event.organization?.members.some(
        (m) => m.userId === userId && (m.role === "OWNER" || m.role === "ADMIN")
    );

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
                <Icon className="w-4 h-4" />
                {type.label}
            </Badge>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative h-96 w-full bg-gray-900">
                {event.image ? (
                    <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover opacity-80"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
                        <Calendar className="h-32 w-32 text-white opacity-50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Event Title and Badges */}
                <div className="absolute bottom-0 left-0 right-0 wrapper pb-8">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {getEventTypeBadge()}
                        <Badge variant="outline" className="bg-white">
                            {event.category.label}
                        </Badge>
                        {event.visibility !== "PUBLIC" && (
                            <Badge variant="secondary">
                                {event.visibility === "PRIVATE" ? "Private" : "Invite Only"}
                            </Badge>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                        {event.title}
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="wrapper my-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
                        </div>

                        {/* Event Details */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-2xl font-bold mb-4">Event Details</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Date & Time</p>
                                        <p className="text-gray-600">
                                            {format(new Date(event.startDateTime), "EEEE, MMMM dd, yyyy")}
                                        </p>
                                        <p className="text-gray-600">
                                            {format(new Date(event.startDateTime), "h:mm a")} -{" "}
                                            {format(new Date(event.endDateTime), "h:mm a")}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Location</p>
                                        <p className="text-gray-600">{event.location}</p>
                                    </div>
                                </div>

                                {event.maxAttendees && (
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Capacity</p>
                                            <p className="text-gray-600">
                                                {event.attendeeCount} / {event.maxAttendees} attendees
                                            </p>
                                            {isFull && (
                                                <Badge variant="destructive" className="mt-1">Event Full</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="font-medium">Price</p>
                                        {event.isFree ? (
                                            <Badge className="bg-green-100 text-green-700">Free</Badge>
                                        ) : (
                                            <p className="text-gray-600 font-semibold">${event.price}</p>
                                        )}
                                    </div>
                                </div>

                                {event.url && (
                                    <div className="flex items-start gap-3">
                                        <Globe className="w-5 h-5 text-gray-500 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Event URL</p>
                                            <a
                                                href={event.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-600 hover:underline"
                                            >
                                                {event.url}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attendees (if user is participant or host) */}
                        {(userParticipation || isHost) && event.participations.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-2xl font-bold mb-4">
                                    Attendees ({event.participations.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {event.participations.map((participation) => (
                                        <div
                                            key={participation.id}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
                                        >
                                            {participation.organization?.logo ? (
                                                <Image
                                                    src={participation.organization.logo}
                                                    alt={participation.organization.name}
                                                    width={40}
                                                    height={40}
                                                    className="rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                                                    <span className="font-semibold text-primary-600">
                                                        {participation.organization?.name.charAt(0) || participation.user.name?.charAt(0)}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium">{participation.user.name}</p>
                                                {participation.organization && (
                                                    <p className="text-sm text-gray-600">{participation.organization.name}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Action Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                            {userParticipation ? (
                                <div>
                                    <Badge className="bg-green-100 text-green-700 mb-4">
                                        ✓ You're Registered
                                    </Badge>
                                    <form action={`/api/events/${event.id}/participate`} method="DELETE">
                                        <Button variant="outline" className="w-full" type="submit">
                                            Cancel Registration
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <div>
                                    {isFull ? (
                                        <div>
                                            <Badge variant="destructive" className="mb-2">Event Full</Badge>
                                            <p className="text-sm text-gray-600">
                                                This event has reached maximum capacity
                                            </p>
                                        </div>
                                    ) : userId ? (
                                        <form action={`/api/events/${event.id}/participate`} method="POST">
                                            <Button className="w-full" size="lg" type="submit">
                                                Join Event
                                            </Button>
                                        </form>
                                    ) : (
                                        <Link href={`/login?callbackUrl=/events/${event.id}`}>
                                            <Button className="w-full" size="lg">
                                                Login to Join
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            )}

                            {isHost && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <Link href={`/events/${event.id}/edit`}>
                                        <Button variant="outline" className="w-full">
                                            Edit Event
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Organization Card */}
                        {event.organization && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h3 className="font-bold mb-4">Hosted By</h3>
                                <Link href={`/organizations/${event.organization.id}`}>
                                    <div className="flex items-center gap-3 hover:bg-gray-50 p-3 rounded-lg transition-colors">
                                        {event.organization.logo ? (
                                            <Image
                                                src={event.organization.logo}
                                                alt={event.organization.name}
                                                width={48}
                                                height={48}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                                                <Building2 className="w-6 h-6 text-primary-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold">{event.organization.name}</p>
                                            <p className="text-sm text-gray-600">View Profile →</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventDetailPage;
