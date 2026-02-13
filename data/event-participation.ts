/**
 * Event Participation Data Access Layer
 * 
 * Security principles:
 * - Validates user membership in organization before participation
 * - Checks event capacity limits
 * - Prevents duplicate participations
 * - Validates payment requirements for paid events
 */

import { prisma } from "@/lib/db";
import { ParticipationStatus } from "@prisma/client";

/**
 * Get all participants for an event
 * Security: Only event host organization can see full participant details
 */
export async function getEventParticipants(eventId: string, requesterId?: string) {
    try {
        const event = await prisma.events.findUnique({
            where: { id: eventId },
            select: { organizationId: true },
        });

        if (!event) {
            throw new Error("Event not found");
        }

        // Check if requester is from host organization
        let isHost = false;
        if (requesterId && event.organizationId) {
            const membership = await prisma.organizationMember.findFirst({
                where: {
                    userId: requesterId,
                    organizationId: event.organizationId,
                },
            });
            isHost = !!membership;
        }

        const participants = await prisma.eventParticipation.findMany({
            where: {
                eventId,
                status: {
                    in: ["REGISTERED", "ATTENDED"],
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: isHost, // Only show email to host
                        image: true,
                    },
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        industry: true,
                    },
                },
            },
            orderBy: {
                registeredAt: "desc",
            },
        });

        return participants;
    } catch (error) {
        console.error("Error fetching event participants:", error);
        throw error;
    }
}

/**
 * Get organization's event participation history
 */
export async function getOrganizationParticipations(
    organizationId: string,
    filters?: {
        status?: ParticipationStatus;
        upcoming?: boolean;
    }
) {
    try {
        const whereClause: any = {
            organizationId,
        };

        if (filters?.status) {
            whereClause.status = filters.status;
        }

        if (filters?.upcoming !== undefined) {
            whereClause.event = {
                startDateTime: filters.upcoming
                    ? { gte: new Date() }
                    : { lt: new Date() },
            };
        }

        const participations = await prisma.eventParticipation.findMany({
            where: whereClause,
            include: {
                event: {
                    include: {
                        category: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                event: {
                    startDateTime: "desc",
                },
            },
        });

        return participations;
    } catch (error) {
        console.error("Error fetching organization participations:", error);
        throw error;
    }
}

/**
 * Get user's event participation history
 */
export async function getUserParticipations(
    userId: string,
    filters?: {
        status?: ParticipationStatus;
        upcoming?: boolean;
    }
) {
    try {
        const whereClause: any = {
            userId,
        };

        if (filters?.status) {
            whereClause.status = filters.status;
        }

        if (filters?.upcoming !== undefined) {
            whereClause.event = {
                startDateTime: filters.upcoming
                    ? { gte: new Date() }
                    : { lt: new Date() },
            };
        }

        const participations = await prisma.eventParticipation.findMany({
            where: whereClause,
            include: {
                event: {
                    include: {
                        category: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                event: {
                    startDateTime: "desc",
                },
            },
        });

        return participations;
    } catch (error) {
        console.error("Error fetching user participations:", error);
        throw error;
    }
}

/**
 * Register for an event
 * Security: Validates user membership, event capacity, and payment requirements
 */
export async function createEventParticipation(data: {
    eventId: string;
    userId: string;
    organizationId?: string;
    stripeId?: string;
    totalAmount?: string;
}) {
    try {
        // Get event details
        const event = await prisma.events.findUnique({
            where: { id: data.eventId },
            select: {
                id: true,
                title: true,
                maxAttendees: true,
                attendeeCount: true,
                isFree: true,
                price: true,
                visibility: true,
                organizationId: true,
            },
        });

        if (!event) {
            throw new Error("Event not found");
        }

        // Check if user is trying to register for their own organization's event
        if (data.organizationId && event.organizationId === data.organizationId) {
            throw new Error("Cannot register for your own organization's event");
        }

        // Validate organization membership if organizationId provided
        if (data.organizationId) {
            const membership = await prisma.organizationMember.findUnique({
                where: {
                    userId_organizationId: {
                        userId: data.userId,
                        organizationId: data.organizationId,
                    },
                },
            });

            if (!membership) {
                throw new Error("User is not a member of the specified organization");
            }
        }

        // Check capacity
        if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) {
            throw new Error("Event is at full capacity");
        }

        // Validate payment for paid events
        if (!event.isFree && !data.stripeId) {
            throw new Error("Payment required for this event");
        }

        // Check for existing participation
        const existingParticipation = await prisma.eventParticipation.findFirst({
            where: {
                eventId: data.eventId,
                OR: [
                    { userId: data.userId },
                    ...(data.organizationId
                        ? [{ organizationId: data.organizationId }]
                        : []),
                ],
                status: {
                    in: ["REGISTERED", "ATTENDED", "WAITLISTED"],
                },
            },
        });

        if (existingParticipation) {
            throw new Error("Already registered for this event");
        }

        // Create participation and update event count in transaction
        const participation = await prisma.$transaction(async (tx) => {
            const newParticipation = await tx.eventParticipation.create({
                data: {
                    eventId: data.eventId,
                    userId: data.userId,
                    organizationId: data.organizationId,
                    stripeId: data.stripeId,
                    totalAmount: data.totalAmount,
                    isPaid: !!data.stripeId,
                    status: "REGISTERED",
                },
                include: {
                    event: {
                        select: {
                            id: true,
                            title: true,
                            startDateTime: true,
                        },
                    },
                    organization: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });

            // Increment attendee count
            await tx.events.update({
                where: { id: data.eventId },
                data: {
                    attendeeCount: {
                        increment: 1,
                    },
                },
            });

            return newParticipation;
        });

        return participation;
    } catch (error) {
        console.error("Error creating event participation:", error);
        throw error;
    }
}

/**
 * Cancel event participation
 * Security: Only the user who registered can cancel
 */
export async function cancelEventParticipation(
    participationId: string,
    userId: string
) {
    try {
        const participation = await prisma.eventParticipation.findUnique({
            where: { id: participationId },
            include: {
                event: {
                    select: {
                        id: true,
                        startDateTime: true,
                    },
                },
            },
        });

        if (!participation) {
            throw new Error("Participation not found");
        }

        // Verify user owns this participation
        if (participation.userId !== userId) {
            throw new Error("Unauthorized: You can only cancel your own registrations");
        }

        // Check if event has already started
        if (participation.event.startDateTime < new Date()) {
            throw new Error("Cannot cancel participation for events that have already started");
        }

        // Update participation status and decrement count in transaction
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.update({
                where: { id: participationId },
                data: {
                    status: "CANCELLED",
                    cancelledAt: new Date(),
                },
            });

            // Decrement attendee count
            await tx.events.update({
                where: { id: participation.eventId },
                data: {
                    attendeeCount: {
                        decrement: 1,
                    },
                },
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Error cancelling event participation:", error);
        throw error;
    }
}

/**
 * Mark participant as attended (host only)
 * Security: Only event host can mark attendance
 */
export async function markParticipantAttended(
    participationId: string,
    requesterId: string
) {
    try {
        const participation = await prisma.eventParticipation.findUnique({
            where: { id: participationId },
            include: {
                event: {
                    select: {
                        organizationId: true,
                    },
                },
            },
        });

        if (!participation) {
            throw new Error("Participation not found");
        }

        // Verify requester is from host organization
        if (participation.event.organizationId) {
            const membership = await prisma.organizationMember.findFirst({
                where: {
                    userId: requesterId,
                    organizationId: participation.event.organizationId,
                },
            });

            if (!membership) {
                throw new Error("Unauthorized: Only event host can mark attendance");
            }
        } else {
            throw new Error("Event has no host organization");
        }

        const updated = await prisma.eventParticipation.update({
            where: { id: participationId },
            data: {
                status: "ATTENDED",
                attendedAt: new Date(),
            },
        });

        return updated;
    } catch (error) {
        console.error("Error marking participant as attended:", error);
        throw error;
    }
}

/**
 * Check if user/organization is participating in an event
 */
export async function checkEventParticipation(
    eventId: string,
    userId: string,
    organizationId?: string
) {
    try {
        const participation = await prisma.eventParticipation.findFirst({
            where: {
                eventId,
                OR: [
                    { userId },
                    ...(organizationId ? [{ organizationId }] : []),
                ],
                status: {
                    in: ["REGISTERED", "ATTENDED", "WAITLISTED"],
                },
            },
        });

        return {
            isParticipating: !!participation,
            participation,
        };
    } catch (error) {
        console.error("Error checking event participation:", error);
        return {
            isParticipating: false,
            participation: null,
        };
    }
}
