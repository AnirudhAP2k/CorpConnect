import { prisma } from "@/lib/db";
import { OrganizationRole, OrganizationSize, OrgDocumentType, Prisma } from "@prisma/client";
import { KYB_DOC_TYPES } from "@/constants";
import type {
    OrganizationDetail,
    OrganizationCard,
    OrganizationWithRole,
    DiscoverOrganizationsResult,
} from "./types";
import type { DiscoverOrganizationsInput } from "./validation";

// ─── Single org ───────────────────────────────────────────────────────────────

/**
 * Fetches a full organization profile by ID.
 * Returns null if not found.
 */
export async function getOrganizationById(id: string): Promise<OrganizationDetail | null> {
    return prisma.organization.findUnique({
        where: { id },
        include: {
            industry: true,
            members: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true, image: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
            orgTags: {
                include: { tag: { select: { id: true, label: true } } },
            },
            _count: { select: { members: true, events: true } },
        },
    }) as Promise<OrganizationDetail | null>;
}

// ─── User's organizations ─────────────────────────────────────────────────────

/**
 * Returns all organizations a user belongs to, including their role.
 */
export async function getUserOrganizations(userId: string): Promise<OrganizationWithRole[]> {
    const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        include: {
            organization: {
                include: {
                    industry: true,
                    _count: { select: { members: true, events: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
        ...m.organization,
        role: m.role,
    }));
}

// ─── Discovery / listing ──────────────────────────────────────────────────────

/**
 * Paginated, filtered discovery of public organizations.
 */
export async function discoverOrganizations(
    input: DiscoverOrganizationsInput
): Promise<DiscoverOrganizationsResult> {
    const { q, industry, size, location, tags, page, limit } = input;
    const skip = (page - 1) * limit;
    const tagIds = tags ? tags.split(",").filter(Boolean) : [];

    const where: Prisma.OrganizationWhereInput = {};

    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }
    if (industry) where.industryId = industry;
    if (size) where.size = size as OrganizationSize;
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (tagIds.length > 0) where.orgTags = { some: { tagId: { in: tagIds } } };

    const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { isVerified: "desc" },
                { events: { _count: "desc" } },
                { createdAt: "desc" },
            ],
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                location: true,
                size: true,
                isVerified: true,
                website: true,
                industry: { select: { id: true, label: true } },
                orgTags: {
                    take: 5,
                    select: { tag: { select: { id: true, label: true } } },
                },
                _count: { select: { members: true, events: true } },
            },
        }),
        prisma.organization.count({ where }),
    ]);

    return {
        organizations: organizations as OrganizationCard[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + organizations.length < total,
    };
}

/**
 * Everything the organization profile page renders: industry, tags, members,
 * recent events and KYB meta.
 */
export async function getOrganizationProfile(id: string) {
    return prisma.organization.findUnique({
        where: { id },
        include: {
            industry: true,
            orgTags: { include: { tag: { select: { id: true, label: true } } } },
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                },
                orderBy: { createdAt: "asc" },
            },
            events: {
                take: 6,
                orderBy: { startDateTime: "desc" },
                include: { category: true },
            },
            meta: true,
            _count: { select: { members: true, events: true } },
        },
    });
}

/**
 * An organization with the calling user's membership, used to gate the
 * organization's event tabs.
 */
export async function getOrganizationWithViewerMembership(id: string, userId?: string) {
    return prisma.organization.findUnique({
        where: { id },
        include: {
            members: userId ? { where: { userId } } : false,
        },
    });
}

/**
 * The connection record between two organizations, in either direction.
 */
export async function getConnectionBetweenOrgs(orgAId: string, orgBId: string) {
    return prisma.orgConnection.findFirst({
        where: {
            OR: [
                { sourceOrgId: orgAId, targetOrgId: orgBId },
                { sourceOrgId: orgBId, targetOrgId: orgAId },
            ],
        },
        select: { id: true, status: true, sourceOrgId: true },
    });
}

/**
 * Just the organization's display name — for page titles and metadata.
 */
export async function getOrganizationName(id: string): Promise<string | null> {
    const org = await prisma.organization.findUnique({
        where: { id },
        select: { name: true },
    });

    return org?.name ?? null;
}

/**
 * KYB verification state and submitted documents for the complete-verification page.
 */
export async function getOrganizationVerification(id: string) {
    return prisma.organization.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            logo: true,
            isVerified: true,
            meta: {
                select: {
                    verificationStatus: true,
                    verificationScore: true,
                    registrationNumber: true,
                    jurisdiction: true,
                    taxId: true,
                    incorporationDate: true,
                    registeredAddress: true,
                },
            },
            orgDocuments: {
                where: { docType: { in: [...KYB_DOC_TYPES] as OrgDocumentType[] } },
                select: { id: true, docType: true, title: true, taxRefNumber: true, createdAt: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });
}

/**
 * The caller's membership in one organization, with the org identity most
 * pages need for their header. Returns null when the user is not a member.
 */
export async function getUserOrgMembership(
    userId: string,
    organizationId: string
): Promise<{ role: OrganizationRole; organization: { id: string; name: string } } | null> {
    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
        select: {
            role: true,
            organization: { select: { id: true, name: true } },
        },
    });

    return membership ?? null;
}

/**
 * Organizations the user administers that still need KYB verification —
 * drives the dashboard reminder banners.
 */
export async function getUnverifiedOrgsForAdmin(userId: string, take = 3) {
    const memberships = await prisma.organizationMember.findMany({
        where: {
            userId,
            role: { in: ["OWNER", "ADMIN"] },
            organization: { isVerified: false },
        },
        select: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    meta: { select: { verificationStatus: true } },
                },
            },
        },
        take,
    });

    return memberships.map((m) => m.organization);
}

/**
 * An organization invitation by its link token, with org and inviter details.
 */
export async function getInviteByToken(token: string) {
    return prisma.pendingInvite.findUnique({
        where: { token },
        include: {
            organization: true,
            inviter: true,
        },
    });
}

/**
 * Whether the user already belongs to any organization — a user may only be a
 * member of one at a time.
 */
export async function hasAnyOrganizationMembership(userId: string): Promise<boolean> {
    const membership = await prisma.organizationMember.findFirst({
        where: { userId },
        select: { id: true },
    });

    return Boolean(membership);
}

/**
 * Pending, unexpired invitations addressed to an email.
 */
export async function getPendingInvitesForEmail(email: string) {
    return prisma.pendingInvite.findMany({
        where: {
            email,
            status: "PENDING",
            expiresAt: { gte: new Date() },
        },
        include: {
            organization: true,
            inviter: { select: { name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

// ─── Industries (used in forms) ───────────────────────────────────────────────

/**
 * Returns all industries ordered alphabetically, for form dropdowns.
 */
export async function getAllIndustries() {
    return prisma.industry.findMany({ orderBy: { label: "asc" } });
}

// ─── Permission helper ────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
    OWNER: 3,
    ADMIN: 2,
    MEMBER: 1,
};

/**
 * Checks whether a user has at least the specified role in an organization.
 * Returns { hasPermission, role }.
 */
export async function checkOrganizationPermission(
    userId: string,
    organizationId: string,
    requiredRole?: OrganizationRole
): Promise<{ hasPermission: boolean; role: OrganizationRole | null }> {
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
    });

    if (!member) return { hasPermission: false, role: null };

    const hasPermission = requiredRole
        ? ROLE_HIERARCHY[member.role] >= ROLE_HIERARCHY[requiredRole]
        : true;

    return { hasPermission, role: member.role };
}
