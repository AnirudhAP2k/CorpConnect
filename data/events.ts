/**
 * Event Data Access Layer — BACKWARD-COMPAT BRIDGE
 *
 * The canonical implementation now lives in @/domain/events.
 * This file re-exports from the domain for any existing code that imports
 * from "@/data/events" until those call-sites are migrated.
 *
 * DO NOT add new logic here. Migrate callers to "@/domain/events".
 */

export {
    getEventById,
    getEventWithMemberCheck as getEventByIdWithMemberCheck,
    getUserEvents,
    getHostEvents,
    getAttendingEvents,
    getPastEvents,
    getMeetingRequestsForEvent,
    getMatchingOrgsForEvent,
} from "@/domain/events";

// getAllEvents is superseded by getEvents (paginated, typed).
// Callers should import getEvents from "@/domain/events".
