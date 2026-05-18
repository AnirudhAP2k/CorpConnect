import { prisma } from "@/lib/db";
import { ApiTier } from "@prisma/client";
import type { PublicUser, UserWithOrgs, UserTier } from "./types";
import type { User } from "@prisma/client";

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
export async function getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
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

    const cred = await prisma.apiCredential.findUnique({
        where: { organizationId: activeOrganizationId },
        select: { tier: true },
    });

    return cred?.tier ?? ApiTier.FREE;
}
