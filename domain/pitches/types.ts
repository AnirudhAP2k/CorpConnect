/**
 * domain/pitches/types.ts
 *
 * Shared TypeScript types and interfaces for the Event Pitching domain.
 * Mirrors the Prisma EventPitch model + application-layer DTOs.
 */

import type { AIEventBrief } from "@/lib/ai-service";

// ─── Re-export for convenience ────────────────────────────────────────────────

export type { AIEventBrief };

// ─── Pitch status enum values ────────────────────────────────────────────────

export const PITCH_STATUS = {
    DRAFT:              "DRAFT",
    PITCHED:            "PITCHED",
    IN_REVIEW:          "IN_REVIEW",
    REVISION_REQUESTED: "REVISION_REQUESTED",
    APPROVED:           "APPROVED",
    REJECTED:           "REJECTED",
} as const;

export type PitchStatus = (typeof PITCH_STATUS)[keyof typeof PITCH_STATUS];

// ─── Core domain types ────────────────────────────────────────────────────────

export interface AgendaItem {
    time?: string;
    item:  string;
}

/** Full EventPitch record as returned from the database. */
export interface EventPitch {
    id:              string;
    organizationId:  string;
    proposedById:    string;
    title:           string;
    description:     string;
    location:        string | null;
    startDateTime:   Date | null;
    endDateTime:     Date | null;
    estimatedBudget: number | null;
    targetAudience:  string | null;
    agenda:          AgendaItem[] | null;
    aiBrief:         string;
    status:          PitchStatus;
    adminNotes:      string | null;
    eventId:         string | null;
    createdAt:       Date;
    updatedAt:       Date;
    // Relations — populated in queries
    proposedBy?: {
        id:    string;
        name:  string | null;
        image: string | null;
        email: string | null;
    };
    organization?: {
        id:   string;
        name: string;
        logo: string | null;
    };
}

/** Serialised pitch for client components (Dates as ISO strings). */
export interface SerializedEventPitch {
    id:              string;
    organizationId:  string;
    proposedById:    string;
    title:           string;
    description:     string;
    location:        string | null;
    startDateTime:   string | null;
    endDateTime:     string | null;
    estimatedBudget: number | null;
    targetAudience:  string | null;
    agenda:          AgendaItem[] | null;
    aiBrief:         string;
    status:          PitchStatus;
    adminNotes:      string | null;
    eventId:         string | null;
    createdAt:       string;
    updatedAt:       string;
    proposedBy?: {
        id:    string;
        name:  string | null;
        image: string | null;
        email: string | null;
    };
    organization?: {
        id:   string;
        name: string;
        logo: string | null;
    };
}

// ─── Action input types ───────────────────────────────────────────────────────

/** Input to create or save a DRAFT pitch from the brainstorm brief. */
export interface CreatePitchInput {
    organizationId:  string;
    proposedById:    string;
    title:           string;
    description:     string;
    aiBrief:         string;
    location?:       string | null;
    startDateTime?:  string | null;     // ISO 8601
    endDateTime?:    string | null;
    estimatedBudget?: number | null;
    targetAudience?: string | null;
    agenda?:         AgendaItem[] | null;
}

/** Input to update editable fields on a DRAFT pitch. */
export interface UpdatePitchInput {
    title?:           string;
    description?:     string;
    aiBrief?:         string;
    location?:        string | null;
    startDateTime?:   string | null;
    endDateTime?:     string | null;
    estimatedBudget?: number | null;
    targetAudience?:  string | null;
    agenda?:          AgendaItem[] | null;
}

/** Input for admin review action. */
export interface ReviewPitchInput {
    status:      "APPROVED" | "REJECTED" | "IN_REVIEW" | "REVISION_REQUESTED";
    adminNotes?: string;
    /** If APPROVED, the admin may associate the pitch with an existing event. */
    eventId?:    string;
}

// ─── Action result types ──────────────────────────────────────────────────────

export type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };
