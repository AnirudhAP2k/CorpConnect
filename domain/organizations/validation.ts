import { z } from "zod";
import { OrganizationSize, HiringStatus } from "@prisma/client";

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
    // B2B profile fields
    services: z.array(z.string().max(60)).max(15).optional().default([]),
    technologies: z.array(z.string().max(60)).max(20).optional().default([]),
    partnershipInterests: z.array(z.string().max(60)).max(10).optional().default([]),
    hiringStatus: z.nativeEnum(HiringStatus).optional().default("NOT_HIRING"),
    linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
    twitterUrl: z.string().url("Please enter a valid Twitter/X URL").optional().or(z.literal("")),
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
    hiringStatus: z.nativeEnum(HiringStatus).optional(),
    linkedinUrl: z.string().url().optional().or(z.literal("")),
    twitterUrl: z.string().url().optional().or(z.literal("")),
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
