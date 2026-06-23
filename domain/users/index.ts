/**
 * Public API for the Users domain.
 */

// Types
export type { User, PublicUser, UserWithOrgs, UserTier } from "./types";

// Validation schemas
export {
    setActiveOrganizationSchema,
    updateUserProfileSchema,
    loginSchema,
    registerSchema,
    resetSchema,
    setNewPasswordSchema,
} from "./validation";

// Queries (safe for Server Components)
export { getUserById, getUserByEmail, getPublicUserById, getUserWithOrgs, getUserTier, getUserActiveOrgRole, getFreshSessionUser, getUserProfileData } from "./queries";

// Server Actions (authenticated mutations)
export { setActiveOrganizationAction, updateUserProfileAction } from "./actions";

// Logout — canonical location is actions/logout.actions.ts
export { logout } from "@/actions/logout.actions";
