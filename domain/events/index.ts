/**
 * Public API for the Events domain.
 *
 * Import from "@/domain/events" for all consumer code.
 */

// Types
export type {
    Events,
    Category,
    EventParticipation,
    EventDetail,
    EventCard,
    EventWithMemberCheck,
    GetEventsResult,
    MatchedOrg,
} from "./types";

// Validation schemas
export {
    eventCreateSchema,
    eventSubmitSchema,
    eventUpdateSchema,
    getEventsSchema,
} from "./validation";

// Read-only queries (safe for Server Components and API routes)
export {
    getEventById,
    getEventWithMemberCheck,
    getEvents,
    getUserEvents,
    getHostEvents,
    getAttendingEvents,
    getPastEvents,
    getMeetingRequestsForEvent,
    getMatchingOrgsForEvent,
} from "./queries";

// Server Actions (authenticated mutations)
export {
    createEventAction,
    updateEventAction,
    deleteEventAction,
} from "./actions";
