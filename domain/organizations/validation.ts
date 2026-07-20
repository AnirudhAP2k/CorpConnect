import { z } from "zod";
import { OrganizationSize, NetworkingIntent } from "@prisma/client";
import { ALLOWED_MIME, KYB_DOC_TYPES } from "@/constants";

// ─── Create ───────────────────────────────────────────────────────────────────

export const organizationCreateSchema = z.object({
    name: z.string()
        .min(2, "Organization name must be at least 2 characters")
        .max(100, "Organization name must be at most 100 characters"),
    industryId: z.string().uuid("Please select a valid industry"),
    description: z.string()
        .min(5, "Description should be at least 5 characters")
        .max(500, "Description should be at most 500 characters")
        .optional(),
    website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
    location: z.string().max(100, "Location should be at most 100 characters").optional(),
    size: z.nativeEnum(OrganizationSize).optional().default("STARTUP"),
    logo: z.string().url().optional(),
    services: z.array(z.string().max(60)).max(15).optional().default([]),
    technologies: z.array(z.string().max(60)).max(20).optional().default([]),
    partnershipInterests: z.array(z.string().max(60)).max(10).optional().default([]),
    networkingIntent: z.nativeEnum(NetworkingIntent).optional().default("GENERAL_NETWORKING"),
    linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
    twitterUrl: z.string().url("Please enter a valid Twitter/X URL").optional().or(z.literal("")),
    tags: z.array(z.string().max(40)).max(10).optional().default([]),
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;

// ─── Submit (API route body — logoUrl replaces File) ─────────────────────────

export const organizationSubmitSchema = organizationCreateSchema
    .omit({ logo: true })
    .extend({
        createdBy: z.string().uuid(),
        logoUrl: z.string().url().optional().or(z.literal("")),
    });

export type OrganizationSubmitInput = z.infer<typeof organizationSubmitSchema>;

// ─── Update ───────────────────────────────────────────────────────────────────

export const organizationUpdateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    industryId: z.string().uuid().optional(),
    description: z.string().min(5).max(500).optional(),
    website: z.string().url().optional().or(z.literal("")),
    location: z.string().max(100).optional(),
    size: z.nativeEnum(OrganizationSize).optional(),
    logo: z.string().url().optional(),
    services: z.array(z.string().max(60)).max(15).optional(),
    technologies: z.array(z.string().max(60)).max(20).optional(),
    partnershipInterests: z.array(z.string().max(60)).max(10).optional(),
    networkingIntent: z.nativeEnum(NetworkingIntent).optional(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    twitterUrl: z.string().url().optional().or(z.literal("")),
    tags: z.array(z.string().max(40)).max(10).optional(),
});

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;

// ─── Members ─────────────────────────────────────────────────────────────────

export const addMemberSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// ─── Discover (query params) ──────────────────────────────────────────────────

export const discoverOrganizationsSchema = z.object({
    q: z.string().optional().default(""),
    industry: z.string().uuid().optional(),
    size: z.nativeEnum(OrganizationSize).optional(),
    location: z.string().optional(),
    tags: z.string().optional(),       // comma-separated tag IDs
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(48).optional().default(24),
});

export type DiscoverOrganizationsInput = z.infer<typeof discoverOrganizationsSchema>;

// ─── Org Document Upload ──────────────────────────────────────────────────────
export const orgDocumentUploadSchema = z.object({
    orgId: z.string().min(1, "orgId is required"),
    docType: z.string().refine(
        (v) => KYB_DOC_TYPES.has(v),
        (v) => ({ message: `Invalid docType: "${v}"` })
    ),
    title: z.string().trim().min(1, "title is required").max(200, "title must be at most 200 characters"),
    taxRefNumber: z.string().trim().max(100).optional(),
    /** MIME type of the uploaded file — validated here so the error message is consistent. */
    mimeType: z.string().refine(
        (v) => ALLOWED_MIME.has(v),
        "Only PDF and image files are allowed (JPEG, PNG, WebP, GIF)"
    ),
});

export type OrgDocumentUploadInput = z.infer<typeof orgDocumentUploadSchema>;
