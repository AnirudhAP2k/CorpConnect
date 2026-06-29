import { z } from "zod";
import { EventVisibility, EventType, EventPaymentMode } from "@prisma/client";

// ─── Create (form-level, File-based image) ────────────────────────────────────

export const eventCreateSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(5, "Description must be at least 5 characters").max(10000),
    location: z.string().min(3, "Location must be at least 3 characters").max(200),
    startDateTime: z.date(),
    endDateTime: z.date(),
    categoryId: z.string().uuid("Please select a category"),
    price: z.string().optional().default("0"),
    isFree: z.boolean().default(true),
    url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    visibility: z.nativeEnum(EventVisibility).default("PUBLIC"),
    eventType: z.nativeEnum(EventType).default("OFFLINE"),
    maxAttendees: z.number().int().positive().optional(),
    paymentMode: z.nativeEnum(EventPaymentMode).default("FREE"),
    currency: z.string().default("INR"),
    externalPayUrl: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string()).optional().default([]),
}).refine(
    (data) => data.endDateTime > data.startDateTime,
    { message: "End date must be after start date", path: ["endDateTime"] }
);

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// ─── Submit (API body — imageUrl replaces File) ───────────────────────────────
// Note: base schema without the date refinement, so we can safely .omit + .extend
const eventBaseSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(5, "Description must be at least 5 characters").max(10000),
    location: z.string().min(3, "Location must be at least 3 characters").max(200),
    categoryId: z.string().uuid("Please select a category"),
    price: z.string().optional().default("0"),
    isFree: z.boolean().default(true),
    url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
    visibility: z.nativeEnum(EventVisibility).default("PUBLIC"),
    eventType: z.nativeEnum(EventType).default("OFFLINE"),
    maxAttendees: z.number().int().positive().optional(),
    paymentMode: z.nativeEnum(EventPaymentMode).default("FREE"),
    currency: z.string().default("INR"),
    externalPayUrl: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string()).optional().default([]),
});

export const eventSubmitSchema = eventBaseSchema.extend({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    imageUrl: z.string(),
    startDateTime: z.string().transform((s) => new Date(s)),
    endDateTime: z.string().transform((s) => new Date(s)),
}).refine(
    (data) => data.endDateTime > data.startDateTime,
    { message: "End date must be after start date", path: ["endDateTime"] }
);

export type EventSubmitInput = z.infer<typeof eventSubmitSchema>;

// ─── Update ───────────────────────────────────────────────────────────────────

export const eventUpdateSchema = eventBaseSchema.partial().extend({
    userId: z.string().uuid(),
    organizationId: z.string().uuid(),
    imageUrl: z.string().optional(),
    startDateTime: z.string().transform((s) => new Date(s)).optional(),
    endDateTime: z.string().transform((s) => new Date(s)).optional(),
});

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

// ─── Query / filter (for listing) ────────────────────────────────────────────

export const getEventsSchema = z.object({
    q: z.string().optional().default(""),
    categoryId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional(),
    visibility: z.nativeEnum(EventVisibility).optional().default("PUBLIC"),
    upcoming: z.boolean().optional().default(true),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type GetEventsInput = z.infer<typeof getEventsSchema>;
