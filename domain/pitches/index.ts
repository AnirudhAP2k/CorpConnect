/**
 * domain/pitches/index.ts
 *
 * Public contract for the pitches domain.
 * Import ONLY from here in app routes, Server Components, and API routes.
 */

// ─── Actions (mutations) ──────────────────────────────────────────────────────
export {
    createPitchAction,
    submitPitchAction,
    updatePitchAction,
    reviewPitchAction,
} from "./actions";

// ─── Queries (reads) ──────────────────────────────────────────────────────────
export {
    getPitchesByOrg,
    getPitchesByMember,
    getPitchById,
    countPendingPitches,
} from "./queries";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
    EventPitch,
    SerializedEventPitch,
    AgendaItem,
    PitchStatus,
    CreatePitchInput,
    UpdatePitchInput,
    ReviewPitchInput,
    ActionResult,
} from "./types";

export { PITCH_STATUS } from "./types";

// ─── Validation ───────────────────────────────────────────────────────────────
export {
    createPitchSchema,
    updatePitchSchema,
    reviewPitchSchema,
} from "./validation";
