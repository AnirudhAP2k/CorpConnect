/**
 * Public API for the Tags domain.
 *
 * Only the items exported here form the stable contract that the rest of the
 * application (UI, API routes, other domains) may depend on.
 *
 * Internal helpers (upsertTags, setEventTags, setOrgTags) are deliberately
 * kept out of this barrel — import them from "@/domain/tags/helpers" only
 * when you need them inside another domain's Server Action.
 */

// Types — re-export Prisma's Tag type for consumers
export type { Tag } from "@prisma/client";

// Validation schemas
export { tagSchema, createTagSchema } from "./validation";

// Read-only queries (safe to call in Server Components)
export { getTagSuggestions, getEventTags, getOrgTags } from "./queries";

// Public Server Actions (authenticated mutations)
export { createTag } from "./actions";
