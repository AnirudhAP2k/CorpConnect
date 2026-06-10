/**
 * domain/pitches/validation.ts
 *
 * Zod schemas for validating EventPitch action inputs.
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const agendaItemSchema = z.object({
    time: z.string().optional(),
    item: z.string().min(1, "Agenda item description is required"),
});

export const createPitchSchema = z.object({
    organizationId:  z.string().uuid(),
    proposedById:    z.string().uuid(),
    title:           z.string().min(3, "Title must be at least 3 characters").max(80),
    description:     z.string().min(10, "Description must be at least 10 characters").max(2000),
    aiBrief:         z.string().min(1, "AI brief is required"),
    location:        z.string().max(255).optional().nullable(),
    startDateTime:   z.string().datetime({ offset: true }).optional().nullable(),
    endDateTime:     z.string().datetime({ offset: true }).optional().nullable(),
    estimatedBudget: z.number().min(0).optional().nullable(),
    targetAudience:  z.string().max(500).optional().nullable(),
    agenda:          z.array(agendaItemSchema).optional().nullable(),
}).refine(
    (data) => {
        if (data.startDateTime && data.endDateTime) {
            return new Date(data.endDateTime) > new Date(data.startDateTime);
        }
        return true;
    },
    { message: "End date must be after start date", path: ["endDateTime"] }
);

export const updatePitchSchema = z.object({
    title:           z.string().min(3).max(80).optional(),
    description:     z.string().min(10).max(2000).optional(),
    aiBrief:         z.string().min(1).optional(),
    location:        z.string().max(255).optional().nullable(),
    startDateTime:   z.string().datetime({ offset: true }).optional().nullable(),
    endDateTime:     z.string().datetime({ offset: true }).optional().nullable(),
    estimatedBudget: z.number().min(0).optional().nullable(),
    targetAudience:  z.string().max(500).optional().nullable(),
    agenda:          z.array(agendaItemSchema).optional().nullable(),
});

export const reviewPitchSchema = z.object({
    status:     z.enum(["APPROVED", "REJECTED", "IN_REVIEW", "REVISION_REQUESTED"]),
    adminNotes: z.string().max(2000).optional(),
    eventId:    z.string().uuid().optional(),
});

export type CreatePitchSchema = z.infer<typeof createPitchSchema>;
export type UpdatePitchSchema = z.infer<typeof updatePitchSchema>;
export type ReviewPitchSchema = z.infer<typeof reviewPitchSchema>;
