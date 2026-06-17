import { prisma } from "@/lib/db";
import { ApiTier } from "@prisma/client";
import type { PublicUser, UserWithOrgs, UserWithRole } from "@/domain/users/types";
import type { OrganizationRole, User } from "@prisma/client";

// ─── User lookups ─────────────────────────────────────────────────────────────

/**
 * Get full user record by ID (includes password hash — server-only).
 * Returns null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
}

/**
 * Get full user record by email (includes password hash — server-only).
 * Returns null if not found.
 */
export async function getUserByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({
        where: { email },
        include: {
            organizationMemberships: {
                select: {
                    organizationId: true,
                    role: true,
                }
            }
        }
    });
}

/**
 * Get a safe public user profile by ID (no password/tokens).
 */
export async function getPublicUserById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            isTwoFactorEnabled: true,
            organizationId: true,
            activeOrganizationId: true,
            hasCompletedOnboarding: true,
        },
    }) as Promise<PublicUser | null>;
}

/**
 * Get a user with all their organization memberships.
 */
export async function getUserWithOrgs(userId: string): Promise<UserWithOrgs | null> {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            emailVerified: true,
            isTwoFactorEnabled: true,
            organizationId: true,
            activeOrganizationId: true,
            hasCompletedOnboarding: true,
            organizationMemberships: {
                include: {
                    organization: {
                        select: { id: true, name: true, logo: true, isVerified: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    }) as Promise<UserWithOrgs | null>;
}

// ─── Tier / entitlement ───────────────────────────────────────────────────────

/**
 * Returns the billing tier of a user's active organization.
 * Defaults to "FREE" if no active org or no API credential found.
 */
export async function getUserTier(
    activeOrganizationId: string | null | undefined
): Promise<ApiTier> {
    if (!activeOrganizationId) return ApiTier.FREE;

    const cred = await prisma.apiCredential.findFirst({
        where: { organizationId: activeOrganizationId, status: "ACTIVE" },
        select: { tier: true },
    });

    return cred?.tier ?? ApiTier.FREE;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the OrganizationRole of a user within their active organization.
 * Called once at sign-in to seed the JWT — never on subsequent requests.
 * Returns null when the user has no active org or no membership record.
 */
export async function getUserActiveOrgRole(
    userId: string,
    activeOrganizationId: string | null | undefined
): Promise<OrganizationRole | null> {
    if (!activeOrganizationId) return null;

    const membership = await prisma.organizationMember.findUnique({
        where: {
            userId_organizationId: { userId, organizationId: activeOrganizationId },
        },
        select: { role: true },
    });

    return membership?.role ?? null;
}

/**
 * Fetches the minimal user fields needed to re-issue a JWT after a token rotation.
 * Returns the user's auth fields plus their active organization role in one round-trip.
 * Used by both the web session-refresh and mobile token-refresh endpoints.
 * Returns null if the user no longer exists (account deleted between rotations).
 */
export async function getFreshSessionUser(
    userId: string,
    activeOrganizationId: string | null | undefined
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            isAppAdmin: true,
            hasCompletedOnboarding: true,
            activeOrganizationId: true,
            organizationMemberships: activeOrganizationId
                ? {
                    where: { organizationId: activeOrganizationId },
                    select: { role: true },
                    take: 1,
                }
                : { take: 0 },
        },
    });

    if (!user) return null;

    return {
        id: user.id,
        isAppAdmin: user.isAppAdmin,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        activeOrganizationId: user.activeOrganizationId,
        role: user.organizationMemberships[0]?.role ?? null,
    };
}
