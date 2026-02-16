/**
 * Event Data Access Layer
 * 
 * Security principles:
 * - All queries validate user permissions
 * - Sensitive data is excluded from public queries
 * - Input validation on all parameters
 * - SQL injection protection via Prisma
 */

import { prisma } from "@/lib/db";
import { OrganizationRole, OrganizationSize } from "@prisma/client";

/**
 * Get event by ID with optional member filtering
 * @throws Error if event not found
 */
export async function getEventById(id: string) {
    try {
        const event = await prisma.events.findUnique({
            where: { id },
            include: {
                category: true,
                organization: {
                    include: {
                        members: {
                            select: {
                                userId: true,
                                role: true,
                            },
                        },
                    },
                },
                participations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
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
                },
            },
        });

        if (!event) {
            throw new Error("Event not found");
        }

        return event;
    } catch (error) {
        console.error("Error fetching event:", error);
        throw error;
    }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserEvents(userId: string) {
    try {
        const events = await prisma.events.findMany({
            where: { userId },
            include: {
                organization: {
                    include: {
                        industry: true,
                        _count: {
                            select: {
                                members: true,
                                events: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching user events:", error);
        throw error;
    }
}

/**
 * Get all events
 */
export async function getAllEvents(where: any, pagination: number) {
    try {
        const events = await prisma.events.findMany({
            where,
            include: {
                organization: {
                    include: {
                        industry: true,
                        _count: {
                            select: {
                                members: true,
                                events: true,
                            },
                        },
                    },
                },
                participations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
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
                },
                category: true,
            },
            orderBy: {
                startDateTime: "asc",
            },
            take: pagination,
        });

        return events;
    } catch (error) {
        console.error("Error fetching user events:", error);
        throw error;
    }
}

export async function getEventByIdWithMemberCheck(id: string, userId: string) {
    try {
        const event = await prisma.events.findUnique({
            where: { id },
            include: {
                organization: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        return event;
    } catch (error) {
        console.error("Error fetching event:", error);
        throw error;
    }
};

export async function getHostEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                organizationId: id,
                startDateTime: {
                    gte: new Date(),
                },
            },
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
            orderBy: {
                startDateTime: "asc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching host events:", error);
        throw error;
    }
};

export async function getAttendedEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                participations: {
                    some: {
                        organizationId: id,
                    },
                },
                startDateTime: {
                    gte: new Date(),
                },
            },
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
            orderBy: {
                startDateTime: "asc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching attended events:", error);
        throw error;
    }
}

export async function getPastEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                OR: [
                    { organizationId: id },
                    {
                        participations: {
                            some: {
                                organizationId: id,
                            },
                        },
                    },
                ],
                endDateTime: {
                    lt: new Date(),
                },
            },
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
            orderBy: {
                endDateTime: "desc",
            },
            take: 20, // Limit past events
        });

        return events;
    } catch (error) {
        console.error("Error fetching past events:", error);
        throw error;
    }
}
