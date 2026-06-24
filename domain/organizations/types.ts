import type {
    Organization,
    OrganizationMember,
    OrganizationRole,
    Industry,
    User,
} from "@prisma/client";

// ─── Re-exports from Prisma ───────────────────────────────────────────────────

export type { Organization, OrganizationMember, OrganizationRole, Industry };

// ─── Composite types ──────────────────────────────────────────────────────────

/**
 * Full organization detail used on the profile page.
 * Includes industry, members (with user info), event counts.
 */
export type OrganizationDetail = Organization & {
    industry: Industry;
    members: (OrganizationMember & {
        user: Pick<User, "id" | "name" | "email" | "image">;
    })[];
    orgTags: { tag: { id: string; label: string } }[];
    _count: { events: number; members: number };
};

/**
 * Lightweight organization card used in lists and discovery.
 */
export type OrganizationCard = Pick<
    Organization,
    "id" | "name" | "description" | "logo" | "location" | "size" | "isVerified" | "website"
> & {
    industry: Pick<Industry, "id" | "label">;
    orgTags: { tag: { id: string; label: string } }[];
    _count: { members: number; events: number };
};

/**
 * Organization with the current user's role attached.
 * Used in "My Organizations" lists.
 */
export type OrganizationWithRole = Organization & {
    industry: Industry;
    role: OrganizationRole;
    _count: { members: number; events: number };
};

/**
 * Result returned from paginated discover query.
 */
export type DiscoverOrganizationsResult = {
    organizations: OrganizationCard[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
};
