/**
 * Organization Server Actions — BACKWARD-COMPAT BRIDGE
 *
 * The canonical implementation now lives in @/domain/organizations/actions.ts.
 * This file re-exports from the domain for existing UI components that import
 * from "@/actions/organization.actions" until those call-sites are migrated.
 *
 * DO NOT add new logic here. Migrate callers to "@/domain/organizations".
 */

export {
    createOrganizationAction as createOrganization,
    updateOrganizationAction as updateOrganization,
    deleteOrganizationAction as deleteOrganization,
    addOrganizationMemberAction as addOrganizationMember,
    removeOrganizationMemberAction as removeOrganizationMember,
} from "@/domain/organizations";

// Read-only actions (these were never true mutations, migrate to queries directly)
export { getUserOrganizations, getAllIndustries } from "@/domain/organizations";
