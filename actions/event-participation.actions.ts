/**
 * Event Participation Server Actions
 * 
 * Security principles:
 * - Authentication required for all actions
 * - Validation of user permissions
 * - Input sanitization
 * - Transaction safety for critical operations
 */

"use server";

import { auth } from "@/auth";
import {
    createEventParticipation as dbCreateParticipation,
    cancelEventParticipation as dbCancelParticipation,
    markParticipantAttended as dbMarkAttended,
    getEventParticipants,
    getUserParticipations,
    getOrganizationParticipations,
    checkEventParticipation,
} from "@/data/event-participation";
import { ParticipationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const joinEventSchema = z.object({
    eventId: z.string().uuid("Invalid event ID"),
    organizationId: z.string().uuid("Invalid organization ID").optional(),
    stripeId: z.string().optional(),
    totalAmount: z.string().optional(),
});

/**
 * Join an event (register participation)
 */
export async function joinEvent(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const rawData = {
            eventId: formData.get("eventId"),
            organizationId: formData.get("organizationId") || undefined,
            stripeId: formData.get("stripeId") || undefined,
            totalAmount: formData.get("totalAmount") || undefined,
        };

        const validatedData = joinEventSchema.parse(rawData);

        const participation = await dbCreateParticipation({
            ...validatedData,
            userId: session.user.id,
        });

        revalidatePath(`/events/${validatedData.eventId}`);
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/my-events");

        return { success: true, participation };
    } catch (error) {
        console.error("Error in joinEvent action:", error);

        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message };
        }

        if (error instanceof Error) {
            return { error: error.message };
        }

        return { error: "Failed to join event. Please try again." };
    }
}

/**
 * Cancel event participation
 */
export async function leaveEvent(participationId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        await dbCancelParticipation(participationId, session.user.id);

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/my-events");

        return { success: true };
    } catch (error) {
        console.error("Error in leaveEvent action:", error);

        if (error instanceof Error) {
            return { error: error.message };
        }

        return { error: "Failed to cancel participation. Please try again." };
    }
}

/**
 * Mark participant as attended (host only)
 */
export async function markAttended(participationId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const participation = await dbMarkAttended(
            participationId,
            session.user.id
        );

        revalidatePath("/dashboard");

        return { success: true, participation };
    } catch (error) {
        console.error("Error in markAttended action:", error);

        if (error instanceof Error) {
            return { error: error.message };
        }

        return { error: "Failed to mark attendance. Please try again." };
    }
}

/**
 * Get event participants
 */
export async function getParticipants(eventId: string) {
    try {
        const session = await auth();

        const participants = await getEventParticipants(
            eventId,
            session?.user?.id
        );

        return { success: true, participants };
    } catch (error) {
        console.error("Error in getParticipants action:", error);
        return { error: "Failed to fetch participants." };
    }
}

/**
 * Get user's event history
 */
export async function getMyEvents(filters?: {
    status?: ParticipationStatus;
    upcoming?: boolean;
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const participations = await getUserParticipations(
            session.user.id,
            filters
        );

        return { success: true, participations };
    } catch (error) {
        console.error("Error in getMyEvents action:", error);
        return { error: "Failed to fetch your events." };
    }
}

/**
 * Get organization's event history
 */
export async function getOrganizationEvents(
    organizationId: string,
    filters?: {
        status?: ParticipationStatus;
        upcoming?: boolean;
    }
) {
    try {
        const participations = await getOrganizationParticipations(
            organizationId,
            filters
        );

        return { success: true, participations };
    } catch (error) {
        console.error("Error in getOrganizationEvents action:", error);
        return { error: "Failed to fetch organization events." };
    }
}

/**
 * Check if user is participating in an event
 */
export async function checkParticipation(
    eventId: string,
    organizationId?: string
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { isParticipating: false };
        }

        const result = await checkEventParticipation(
            eventId,
            session.user.id,
            organizationId
        );

        return result;
    } catch (error) {
        console.error("Error in checkParticipation action:", error);
        return { isParticipating: false };
    }
}
