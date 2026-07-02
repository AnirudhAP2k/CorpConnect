import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Calendar, MapPin, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { getEventInviteByToken } from "@/domain/events";
import type { Metadata } from "next";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventInvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

// ─── Dynamic metadata for SEO ─────────────────────────────────────────────────

export async function generateMetadata({ params }: EventInvitePageProps): Promise<Metadata> {
    const { token } = await params;
    const invite = await getEventInviteByToken(token);

    if (!invite) {
        return { title: "Invalid Invitation | CorpConnect" };
    }

    return {
        title: `You're Invited: ${invite.event.title} | CorpConnect`,
        description: `Join ${invite.event.title} on CorpConnect. Accept your invitation to attend this event.`,
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventInvitePage({ params }: EventInvitePageProps) {
    const session = await auth();
    const userId = session?.user?.id;
    const { token } = await params;

    const invite = await getEventInviteByToken(token);

    // ─── Invalid token ────────────────────────────────────────────────────
    if (!invite) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Invalid Invitation</CardTitle>
                        <CardDescription className="text-center">
                            This invitation link is invalid or has been removed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/">
                            <Button>Go Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Expired ──────────────────────────────────────────────────────────
    if (invite.expiresAt < new Date()) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <Clock className="w-16 h-16 text-orange-500" />
                        </div>
                        <CardTitle className="text-center">Invitation Expired</CardTitle>
                        <CardDescription className="text-center">
                            This invitation has expired. Please contact the event organizer for a new invitation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-center">
                        <p className="text-sm text-gray-600">
                            Event: <strong>{invite.event.title}</strong>
                        </p>
                        <Link href="/">
                            <Button>Go Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ─── Already accepted ─────────────────────────────────────────────────
    if (invite.status === "ACCEPTED") {
        redirect(`/events/${invite.eventId}`);
    }

    // ─── Force login/signup if not authenticated ──────────────────────────
    if (!userId) {
        redirect(`/login?callbackUrl=/events/invite/${token}`);
    }

    // ─── User is authenticated — process the invitation atomically ────────
    try {
        // Check if user is already participating in this event
        const existingParticipation = await prisma.eventParticipation.findUnique({
            where: {
                eventId_userId: {
                    eventId: invite.eventId,
                    userId,
                },
            },
        });

        await prisma.$transaction(async (tx) => {
            // 1. Mark invite as accepted
            await tx.eventInvite.update({
                where: { id: invite.id },
                data: { status: "ACCEPTED" },
            });

            // 2. Only create participation if not already registered
            if (!existingParticipation) {
                await tx.eventParticipation.create({
                    data: {
                        eventId: invite.eventId,
                        userId,
                        status: "REGISTERED",
                    },
                });

                // 3. Increment attendee count
                await tx.events.update({
                    where: { id: invite.eventId },
                    data: {
                        attendeeCount: { increment: 1 },
                    },
                });
            }
        });

        // Success! Show a confirmation before redirecting
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <CardTitle className="text-center">You&apos;re In!</CardTitle>
                        <CardDescription className="text-center">
                            You have been successfully registered for this event.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Event summary card */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            {invite.event.image && (
                                <div className="relative h-32 w-full rounded-md overflow-hidden">
                                    <Image
                                        src={invite.event.image}
                                        alt={invite.event.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}
                            <h3 className="font-semibold text-lg">{invite.event.title}</h3>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {format(new Date(invite.event.startDateTime), "EEEE, MMMM dd, yyyy 'at' h:mm a")}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4" />
                                <span>{invite.event.location}</span>
                            </div>

                            {invite.event.organization && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    {invite.event.organization.logo ? (
                                        <Image
                                            src={invite.event.organization.logo}
                                            alt={invite.event.organization.name}
                                            width={16}
                                            height={16}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <Building2 className="w-4 h-4" />
                                    )}
                                    <span>Hosted by {invite.event.organization.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center">
                            <Link href={`/events/${invite.eventId}`}>
                                <Button className="w-full">View Event Details</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    } catch (error) {
        console.error("[EventInvitePage] Error accepting invite:", error);
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Registration Error</CardTitle>
                        <CardDescription className="text-center">
                            An error occurred while processing your invitation. Please try again or contact the event organizer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/">
                            <Button>Go Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
}
