/**
 * Public API for the Organizations domain.
 *
 * Import from "@/domain/organizations" for all consumer code
 * (UI components, API routes, other domains).
 */

// Types
export type {
    Organization,
    OrganizationMember,
    OrganizationRole,
    Industry,
    OrganizationDetail,
    OrganizationCard,
    OrganizationWithRole,
    DiscoverOrganizationsResult,
} from "./types";

// Validation schemas
export {
    organizationCreateSchema,
    organizationSubmitSchema,
    organizationUpdateSchema,
    addMemberSchema,
    discoverOrganizationsSchema,
} from "./validation";

// Read-only queries (safe for Server Components)
export {
    getOrganizationById,
    getUserOrganizations,
    discoverOrganizations,
    getAllIndustries,
    checkOrganizationPermission,
} from "./queries";

// Server Actions (authenticated mutations)
export {
    createOrganizationAction,
    updateOrganizationAction,
    deleteOrganizationAction,
    addOrganizationMemberAction,
    removeOrganizationMemberAction,
    transferOrganizationOwnershipAction,
} from "./actions";
