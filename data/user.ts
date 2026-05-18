/**
 * User Data Access Layer — BACKWARD-COMPAT BRIDGE
 *
 * The canonical implementation now lives in @/domain/users.
 * This file re-exports from the domain for existing code that imports
 * from "@/data/user" until those call-sites are migrated.
 *
 * DO NOT add new logic here. Migrate callers to "@/domain/users".
 */

export { getUserById, getUserByEmail } from "@/domain/users";

// getUserTier now takes activeOrganizationId directly (not a User object).
// Callers should import getUserTier from "@/domain/users" and adapt.
export { getUserTier } from "@/domain/users";

export { getUserActiveOrgRole } from "@/domain/users";
