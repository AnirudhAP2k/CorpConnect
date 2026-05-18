import type { User, Organization, OrganizationMember, ApiTier, OrganizationRole } from "@prisma/client";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { User, ApiTier };

// Alias for clarity at call-sites
export type UserTier = ApiTier;
export type PublicUser = Pick<
    User,
    "id" | "name" | "email" | "image" | "emailVerified" | "isTwoFactorEnabled" |
    "organizationId" | "activeOrganizationId" | "hasCompletedOnboarding"
>;

/**
 * User with their organization memberships and active org details.
 */
export type UserWithOrgs = PublicUser & {
    organizationMemberships: (OrganizationMember & {
        organization: Pick<Organization, "id" | "name" | "logo" | "isVerified">;
    })[];
};

/**
 * Type for user with only role information
 */
export type UserWithRole = User & {
    organizationMemberships: {
        organizationId: string;
        role: OrganizationRole
    }[]
};
