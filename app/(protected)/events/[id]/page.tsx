import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Globe, Zap, Building2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { getEventById, getMeetingRequestsForEvent } from "@/data/events";
import { prisma } from "@/lib/db";
import JoinEventButton from "@/components/shared/JoinEventButton";
import CancelParticipationButton from "@/components/shared/CancelParticipationButton";
import EventParticipantsPanel from "@/components/shared/EventParticipantsPanel";
import EventViewTracker from "@/components/shared/EventViewTracker";
import OrgMatchWidget from "@/components/events/OrgMatchWidget";
import MeetingRequestsPanel from "@/components/events/MeetingRequestsPanel";
import { getMatchingOrgsForEvent } from "@/data/events";
import type { MeetingStatus } from "@/lib/types";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { getUserFeedback } from "@/lib/actions/feedback";

interface EventDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

const EventDetailPage = async ({ params }: EventDetailPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    const { id } = await params;

    const event = await getEventById(id);

    // Get user's active organization for participation
    const userOrgData = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { activeOrganizationId: true },
        })
        : null;
    const activeOrgId = userOrgData?.activeOrganizationId ?? null;

    if (!event) {
        notFound();
    }

    // Check visibility permissions
    if (event.visibility === "PRIVATE") {
        if (!userId) {
            redirect(`/login?callbackUrl=/events/${id}`);
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
            redirect(`/login?callbackUrl=/events/${id}`);
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

    // Matchmaking & meeting requests (only if user is registered with an active org)
    const isRegistered = !!userParticipation;
    const participationStatus = userParticipation?.status;
    const canLeaveFeedback = isRegistered && participationStatus !== "CANCELLED";

    const [matchedOrgs, existingMeetingRequests, existingFeedback] = (isRegistered && activeOrgId)
        ? await Promise.all([
            getMatchingOrgsForEvent(id, activeOrgId),
            getMeetingRequestsForEvent(id, activeOrgId),
            canLeaveFeedback ? getUserFeedback(id) : Promise.resolve(null),
        ])
        : [
            [],
            [],
            canLeaveFeedback ? await getUserFeedback(id) : null,
        ];

    // Build meetingStatusMap for OrgMatchWidget
    const meetingStatusMap: Record<string, { status: MeetingStatus; requestId?: string }> = {};
    for (const mr of existingMeetingRequests as any[]) {
        const otherOrgId = mr.senderOrgId === activeOrgId ? mr.receiverOrgId : mr.senderOrgId;
        const isSender = mr.senderOrgId === activeOrgId;
        let status: MeetingStatus = "NONE";
        if (mr.status === "PENDING") status = isSender ? "PENDING_SENT" : "PENDING_RECEIVED";
        else if (mr.status === "ACCEPTED") status = "ACCEPTED";
        else if (mr.status === "DECLINED") status = "DECLINED";
        else if (mr.status === "CANCELLED") status = "CANCELLED";
        meetingStatusMap[otherOrgId] = { status, requestId: mr.id };
    }

    // Split meeting requests for the panel
    const incomingMeetings = (existingMeetingRequests as any[]).filter((mr: any) => mr.receiverOrgId === activeOrgId && mr.status === "PENDING");
    const sentMeetings = (existingMeetingRequests as any[]).filter((mr: any) => mr.senderOrgId === activeOrgId && mr.status === "PENDING");
    const confirmedMeetings = (existingMeetingRequests as any[]).filter((mr: any) => mr.status === "ACCEPTED");

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
        <>
            <div className="min-h-screen bg-gray-50">

                <EventViewTracker eventId={id} />
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

                            {/* Attendees panel (visible to host or registered attendees) */}
                            {(userParticipation || isHost) && (
                                <EventParticipantsPanel
                                    participants={event.participations as any}
                                    isHost={!!isHost}
                                    totalCount={event.attendeeCount}
                                />
                            )}

                            {/* Meeting requests panel (registered attendees with an active org only) */}
                            {isRegistered && activeOrgId && (
                                <MeetingRequestsPanel
                                    eventId={id}
                                    callerOrgId={activeOrgId}
                                    incoming={incomingMeetings}
                                    sent={sentMeetings}
                                    confirmed={confirmedMeetings}
                                />
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Action Card */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
                                {userParticipation ? (
                                    <div className="space-y-3">
                                        <Badge className="bg-green-100 text-green-700 w-full justify-center py-1.5">
                                            ✓ You&apos;re Registered
                                        </Badge>
                                        <CancelParticipationButton
                                            eventId={event.id}
                                            eventTitle={event.title}
                                        />
                                        {/* Feedback button — only for non-cancelled participants */}
                                        {canLeaveFeedback && (
                                            <FeedbackButton
                                                eventId={event.id}
                                                eventTitle={event.title}
                                                existing={existingFeedback}
                                            />
                                        )}
                                    </div>
                                ) : isHost ? (
                                    <div className="space-y-2">
                                        <Badge className="bg-purple-100 text-purple-700 w-full justify-center py-1.5">
                                            You&apos;re the Host
                                        </Badge>
                                        <Link href={`/events/${event.id}/edit`}>
                                            <Button variant="outline" className="w-full">
                                                Edit Event
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <JoinEventButton
                                        eventId={event.id}
                                        isFull={isFull}
                                        isLoggedIn={!!userId}
                                        activeOrganizationId={activeOrgId}
                                    />
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

                            {/* Org match widget (registered attendees with active org only) */}
                            {isRegistered && activeOrgId && matchedOrgs.length > 0 && (
                                <OrgMatchWidget
                                    eventId={id}
                                    callerOrgId={activeOrgId}
                                    matchedOrgs={matchedOrgs}
                                    meetingStatusMap={meetingStatusMap}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Chat Widget — available to all logged-in users who can see this event */}
            {userId && (
                <ChatWidget
                    contextId={event.id}
                    contextType="EVENT"
                    contextName={event.title}
                />
            )}
        </>
    );
};

export default EventDetailPage;
