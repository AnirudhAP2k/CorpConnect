import { prisma } from "@/lib/db";
import { OrganizationRole, OrganizationSize, Prisma } from "@prisma/client";
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
