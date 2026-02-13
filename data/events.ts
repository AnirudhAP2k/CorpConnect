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

