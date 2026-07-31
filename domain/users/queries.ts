import { prisma } from "@/lib/db";
import { ApiTier, EventVisibility } from "@prisma/client";
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
            headline: true,
            bio: true,
            location: true,
            phone: true,
            linkedinUrl: true,
            websiteUrl: true,
            twitterUrl: true,
        },
    }) as Promise<PublicUser | null>;
}

/**
 * Data for the publicly shareable profile page. Contact details the user did
 * not choose to publish (email, phone) are deliberately excluded.
 */
export async function getSharedProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            image: true,
            headline: true,
            bio: true,
            location: true,
            linkedinUrl: true,
            websiteUrl: true,
            twitterUrl: true,
            createdAt: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    logo: true,
                    location: true,
                    website: true,
                    description: true,
                    isVerified: true,
                    services: true,
                    technologies: true,
                    partnershipInterests: true,
                    industry: { select: { label: true } },
                    _count: { select: { members: true, events: true } },
                },
            },
            organizationMemberships: {
                select: {
                    id: true,
                    role: true,
                    createdAt: true,
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            logo: true,
                            location: true,
                            isVerified: true,
                            industry: { select: { label: true } },
                        },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!user) return null;

    // Only PUBLIC events are exposed here — private events would leak the
    // user's whereabouts to anyone holding the link.
    const publicEvent = { visibility: EventVisibility.PUBLIC } as const;

    const [eventsAttended, eventsHosted, hostedEvents, recentPublicEvents, groupsCreated] =
        await Promise.all([
            prisma.eventParticipation.count({
                where: { userId, status: "ATTENDED", event: publicEvent },
            }),

            prisma.events.count({ where: { userId, ...publicEvent } }),

            prisma.events.findMany({
                where: { userId, ...publicEvent, startDateTime: { gte: new Date() } },
                select: {
                    id: true,
                    title: true,
                    startDateTime: true,
                    location: true,
                    eventType: true,
                    organization: { select: { id: true, name: true } },
                },
                orderBy: { startDateTime: "asc" },
                take: 3,
            }),

            prisma.eventParticipation.findMany({
                where: { userId, status: "ATTENDED", event: publicEvent },
                select: {
                    id: true,
                    event: {
                        select: {
                            id: true,
                            title: true,
                            startDateTime: true,
                            organization: { select: { id: true, name: true } },
                        },
                    },
                },
                orderBy: { event: { startDateTime: "desc" } },
                take: 3,
            }),

            prisma.industryGroup.findMany({
                where: { createdById: userId },
                select: {
                    id: true,
                    name: true,
                    logo: true,
                    industry: { select: { label: true } },
                    _count: { select: { members: true } },
                },
                take: 4,
            }),
        ]);

    return {
        ...user,
        eventsAttended,
        eventsHosted,
        hostedEvents,
        recentPublicEvents,
        groupsCreated,
    };
}

/**
 * Get everything the profile edit screen needs: the editable profile fields,
 * whether the account can use two-factor auth (credentials sign-in only),
 * and the organizations the user may switch between.
 */
export async function getProfileEditData(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            image: true,
            isTwoFactorEnabled: true,
            activeOrganizationId: true,
            headline: true,
            bio: true,
            location: true,
            phone: true,
            linkedinUrl: true,
            websiteUrl: true,
            twitterUrl: true,
            password: true,
            organizationMemberships: {
                select: {
                    organization: { select: { id: true, name: true, logo: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!user) return null;

    const { password, organizationMemberships, ...profile } = user;

    return {
        ...profile,
        canUseTwoFactor: Boolean(password),
        organizations: organizationMemberships.map((m) => m.organization),
    };
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
            headline: true,
            bio: true,
            location: true,
            phone: true,
            linkedinUrl: true,
            websiteUrl: true,
            twitterUrl: true,
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

// ─── Profile page aggregate ───────────────────────────────────────────────────

/**
 * Fetches all dynamic data needed for the user profile page in parallel.
 * Returns null if the user does not exist.
 */
export async function getUserProfileData(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            organization: {
                include: {
                    industry: true,
                    _count: { select: { members: true, events: true } },
                },
            },
            organizationMemberships: {
                include: {
                    organization: {
                        select: { id: true, name: true, logo: true, isVerified: true, location: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!user) return null;

    const activeOrgId = user.activeOrganizationId ?? user.organizationId;

    // Parallel data fetches
    const [
        eventsAttended,
        eventsRegistered,
        upcomingEvents,
        connectionsCount,
        recentParticipations,
        orgMembers,
        eventsHosted,
        hostedEvents,
    ] = await Promise.all([
        // Events actually attended
        prisma.eventParticipation.count({
            where: { userId, status: "ATTENDED" },
        }),

        // Total event registrations (non-cancelled)
        prisma.eventParticipation.count({
            where: { userId, status: { not: "CANCELLED" } },
        }),

        // Next 3 upcoming events user is registered for
        prisma.eventParticipation.findMany({
            where: {
                userId,
                status: "REGISTERED",
                event: { startDateTime: { gte: new Date() } },
            },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        startDateTime: true,
                        image: true,
                        location: true,
                        organization: { select: { id: true, name: true, logo: true } },
                    },
                },
            },
            orderBy: { event: { startDateTime: "asc" } },
            take: 3,
        }),

        // Org connections (accepted) — only if user has an active org
        activeOrgId
            ? prisma.orgConnection.count({
                where: {
                    OR: [
                        { sourceOrgId: activeOrgId, status: "ACCEPTED" },
                        { targetOrgId: activeOrgId, status: "ACCEPTED" },
                    ],
                },
            })
            : 0,

        // Recent event participations for activity feed
        prisma.eventParticipation.findMany({
            where: { userId, status: { not: "CANCELLED" } },
            include: {
                event: {
                    select: { id: true, title: true, startDateTime: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),

        // Other members in same org (for network avatars)
        activeOrgId
            ? prisma.organizationMember.findMany({
                where: { organizationId: activeOrgId, userId: { not: userId } },
                include: {
                    user: { select: { id: true, name: true, image: true } },
                },
                take: 5,
                orderBy: { createdAt: "asc" },
            })
            : [],

        // Events the user created
        prisma.events.count({ where: { userId } }),

        // Next events the user is hosting
        prisma.events.findMany({
            where: { userId, startDateTime: { gte: new Date() } },
            select: {
                id: true,
                title: true,
                startDateTime: true,
                location: true,
                visibility: true,
                attendeeCount: true,
            },
            orderBy: { startDateTime: "asc" },
            take: 3,
        }),
    ]);

    return {
        user,
        eventsAttended,
        eventsRegistered,
        upcomingEvents,
        connectionsCount,
        recentParticipations,
        orgMembers,
        eventsHosted,
        hostedEvents,
    };
}

/**
 * The user's primary organization, or null when they belong to none.
 */
export async function getUserPrimaryOrganization(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            organizationId: true,
            organization: { select: { id: true, name: true, logo: true, isVerified: true } },
        },
    });

    if (!user?.organizationId || !user.organization) return null;

    return user.organization;
}

/**
 * Identity and industry context the dashboard header and recommendations need.
 */
export async function getDashboardUser(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            isAppAdmin: true,
            activeOrganizationId: true,
            organization: { select: { industryId: true } },
        },
    });

    if (!user) return null;

    return {
        name: user.name,
        isAppAdmin: user.isAppAdmin,
        activeOrganizationId: user.activeOrganizationId,
        industryId: user.organization?.industryId,
    };
}

/**
 * Fetches the user's image by ID.
 * Returns null if the user does not exist.
 */
export async function getUserImage(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { image: true },
    });

    return user?.image ?? null;
}
