/**
 * Organization Data Access Layer — BACKWARD-COMPAT BRIDGE
 *
 * The canonical implementation now lives in @/domain/organizations.
 * This file re-exports from the domain for any existing code that imports
 * from "@/data/organization" until those call-sites are migrated.
 *
 * DO NOT add new logic here. Migrate callers to "@/domain/organizations".
 */

export {
    getOrganizationById,
    getUserOrganizations,
    getAllIndustries,
    checkOrganizationPermission,
} from "@/domain/organizations";

// addMemberToOrganization / removeMemberFromOrganization are now Server Actions.
// Callers should import from "@/domain/organizations":
//   addOrganizationMemberAction, removeOrganizationMemberAction

// updateOrganization / createOrganization are now Server Actions.
// Callers should import from "@/domain/organizations":
//   createOrganizationAction, updateOrganizationAction

// getOrganizationMembers is now part of getOrganizationById include.
