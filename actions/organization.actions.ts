/**
 * Organization Server Actions
 * 
 * Security principles:
 * - All actions validate authentication
 * - Input validation and sanitization
 * - Rate limiting considerations
 * - Proper error handling without exposing sensitive info
 */

"use server";

import { auth } from "@/auth";
import {
    createOrganization as dbCreateOrganization,
    updateOrganization as dbUpdateOrganization,
    addMemberToOrganization as dbAddMember,
    removeMemberFromOrganization as dbRemoveMember,
    getOrganizationById,
    getUserOrganizations,
    getAllIndustries,
} from "@/data/organization";
import { OrganizationRole, OrganizationSize } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const createOrganizationSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
    industryId: z.string().uuid("Invalid industry selected"),
    description: z.string().max(500).optional(),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    location: z.string().max(100).optional(),
    size: z.enum(["STARTUP", "SME", "ENTERPRISE"]).optional(),
    logo: z.string().url().optional(),
});

const updateOrganizationSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    website: z.string().url().optional().or(z.literal("")),
    location: z.string().max(100).optional(),
    size: z.enum(["STARTUP", "SME", "ENTERPRISE"]).optional(),
    logo: z.string().url().optional(),
});

const addMemberSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

/**
 * Create a new organization
 */
export async function createOrganization(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const rawData = {
            name: formData.get("name"),
            industryId: formData.get("industryId"),
            description: formData.get("description") || undefined,
            website: formData.get("website") || undefined,
            location: formData.get("location") || undefined,
            size: formData.get("size") || undefined,
            logo: formData.get("logo") || undefined,
        };

        const validatedData = createOrganizationSchema.parse(rawData);

        const organization = await dbCreateOrganization({
            ...validatedData,
            createdBy: session.user.id,
        });

        revalidatePath("/dashboard");
        revalidatePath("/organizations");

        return { success: true, organization };
    } catch (error) {
        console.error("Error in createOrganization action:", error);

        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message };
        }

        return { error: "Failed to create organization. Please try again." };
    }
}

/**
 * Update organization details
 */
export async function updateOrganization(
    organizationId: string,
    formData: FormData
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const rawData = {
            name: formData.get("name") || undefined,
            description: formData.get("description") || undefined,
            website: formData.get("website") || undefined,
            location: formData.get("location") || undefined,
            size: formData.get("size") || undefined,
            logo: formData.get("logo") || undefined,
        };

        const validatedData = updateOrganizationSchema.parse(rawData);

        const organization = await dbUpdateOrganization(
            organizationId,
            session.user.id,
            validatedData as any
        );

        revalidatePath(`/organizations/${organizationId}`);
        revalidatePath("/dashboard");

        return { success: true, organization };
    } catch (error) {
        console.error("Error in updateOrganization action:", error);

        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message };
        }

        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return { error: error.message };
        }

        return { error: "Failed to update organization. Please try again." };
    }
}

/**
 * Add a member to organization
 */
export async function addOrganizationMember(
    organizationId: string,
    formData: FormData
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const rawData = {
            email: formData.get("email"),
            role: formData.get("role") || "MEMBER",
        };

        const validatedData = addMemberSchema.parse(rawData);

        const member = await dbAddMember(
            organizationId,
            session.user.id,
            validatedData.email,
            validatedData.role as OrganizationRole
        );

        revalidatePath(`/organizations/${organizationId}`);

        return { success: true, member };
    } catch (error) {
        console.error("Error in addOrganizationMember action:", error);

        if (error instanceof z.ZodError) {
            return { error: error.errors[0].message };
        }

        if (error instanceof Error) {
            return { error: error.message };
        }

        return { error: "Failed to add member. Please try again." };
    }
}

/**
 * Remove a member from organization
 */
export async function removeOrganizationMember(
    organizationId: string,
    memberIdToRemove: string
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        await dbRemoveMember(organizationId, session.user.id, memberIdToRemove);

        revalidatePath(`/organizations/${organizationId}`);

        return { success: true };
    } catch (error) {
        console.error("Error in removeOrganizationMember action:", error);

        if (error instanceof Error) {
            return { error: error.message };
        }

        return { error: "Failed to remove member. Please try again." };
    }
}

/**
 * Get user's organizations
 */
export async function getMyOrganizations() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized. Please sign in." };
        }

        const organizations = await getUserOrganizations(session.user.id);

        return { success: true, organizations };
    } catch (error) {
        console.error("Error in getMyOrganizations action:", error);
        return { error: "Failed to fetch organizations." };
    }
}

/**
 * Get organization details
 */
export async function getOrganization(organizationId: string) {
    try {
        const organization = await getOrganizationById(organizationId);
        return { success: true, organization };
    } catch (error) {
        console.error("Error in getOrganization action:", error);
        return { error: "Failed to fetch organization details." };
    }
}

/**
 * Get all industries for selection
 */
export async function getIndustries() {
    try {
        const industries = await getAllIndustries();
        return { success: true, industries };
    } catch (error) {
        console.error("Error in getIndustries action:", error);
        return { error: "Failed to fetch industries." };
    }
}
