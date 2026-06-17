/**
 * Public API for the API Credentials domain.
 *
 * Import from "@/domain/api-credentials" for all consumer code
 * (API routes, webhook handlers, other domains).
 */

// Types
export type {
    ApiCredentialInfo,
    ApiCredentialWithRawKey,
    SyncCredentialTierInput,
} from "./types";

// Read-only queries (safe for Server Components and API route GET handlers)
export {
    getCredentialByOrgId,
    credentialExistsForOrg,
} from "./queries";

// Mutations (authenticated, use in API route handlers and webhook processors)
export {
    generateCredential,
    revokeCredential,
    syncCredentialTier,
    ensureCredential,
} from "./actions";
