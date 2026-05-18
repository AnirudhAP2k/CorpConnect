import type {
    Events,
    Category,
    Organization,
    OrganizationMember,
    EventParticipation,
    User,
} from "@prisma/client";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type { Events, Category, EventParticipation };

// ─── Composite types ──────────────────────────────────────────────────────────

/**
 * Full event detail including category, host org with members,
 * and current participations. Used on the event detail page.
 */
export type EventDetail = Events & {
    category: Category;
    organization: (Organization & {
        members: Pick<OrganizationMember, "userId" | "role">[];
    }) | null;
    participations: (EventParticipation & {
        user: Pick<User, "id" | "name" | "image">;
        organization: Pick<Organization, "id" | "name" | "logo"> | null;
    })[];
};

/**
 * Lightweight event used in lists and collection views.
 */
export type EventCard = Events & {
    category: Category;
    organization: Pick<Organization, "id" | "name" | "logo"> | null;
};

/**
 * Event with only permission-check membership data.
 * Used internally for auth-gating edits/deletes.
 */
export type EventWithMemberCheck = Events & {
    organization: (Organization & {
        members: Pick<OrganizationMember, "userId" | "role">[];
    }) | null;
};

/**
 * Paginated events result.
 */
export type GetEventsResult = {
    events: EventCard[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
};

/**
 * MatchedOrg shape for event-level AI/SQL org recommendations.
 */
export type MatchedOrg = {
    id: string;
    name: string;
    logo: string | null;
    location: string | null;
    industry: { label: string } | null;
    services: string[];
    technologies: string[];
    partnershipInterests: string[];
    score: number;
    matchReason: string;
    source: "ai" | "sql";
};
