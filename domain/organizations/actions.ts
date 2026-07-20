"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { JobType, OrganizationRole } from "@prisma/client";
import {
    organizationCreateSchema,
    organizationUpdateSchema,
    addMemberSchema,
} from "./validation";
import { checkOrganizationPermission } from "./queries";
import type { OrganizationUpdateInput } from "./validation";
import { setOrgTags } from "@/domain/tags/helpers";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ADMINS = 5;

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createOrganizationAction(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const raw = {
        name: formData.get("name"),
        industryId: formData.get("industryId"),
        description: formData.get("description") || undefined,
        website: formData.get("website") || undefined,
        location: formData.get("location") || undefined,
        size: formData.get("size") || undefined,
        logo: formData.get("logo") || undefined,
        services: JSON.parse((formData.get("services") as string) || "[]"),
        technologies: JSON.parse((formData.get("technologies") as string) || "[]"),
        partnershipInterests: JSON.parse((formData.get("partnershipInterests") as string) || "[]"),
        networkingIntent: formData.get("networkingIntent") || undefined,
        linkedinUrl: formData.get("linkedinUrl") || undefined,
        twitterUrl: formData.get("twitterUrl") || undefined,
        tags: JSON.parse((formData.get("tags") as string) || "[]"),
    };

    const parsed = organizationCreateSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { logo, industryId, tags: tagLabels, ...rest } = parsed.data;

    try {
        const industry = await prisma.industry.findUnique({ where: { id: industryId } });
        if (!industry) return { error: "Invalid industry selected." };

        const organization = await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: { ...rest, logo, industryId, createdBy: session.user!.id!, meta: { create: {} } },
                include: { industry: true },
            });
            await tx.organizationMember.create({
                data: { userId: session.user!.id!, organizationId: org.id, role: "OWNER" },
            });
            await tx.user.update({
                where: { id: session.user!.id! },
                data: { organizationId: org.id, hasCompletedOnboarding: true },
            });
            return org;
        });

        // Fire-and-forget background jobs
        prisma.jobQueue.create({
            data: { type: JobType.EMBED_ORG, payload: { orgId: organization.id } },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_ORG:", err));

        // Persist org tags via junction table
        if (tagLabels && tagLabels.length > 0) {
            await setOrgTags(organization.id, tagLabels);
        }

        prisma.jobQueue.create({
            data: {
                type: JobType.VERIFY_ORG_LEVEL_1,
                payload: { orgId: organization.id, creatorEmail: session.user!.email },
            },
        }).catch((err) => console.error("[OrgVerification] Failed to enqueue L1:", err));

        revalidateTag("organizations");
        revalidatePath("/dashboard");

        return {
            success: true,
            organizationId: organization.id,
            organizationName: organization.name,
            kybUrl: `/organizations/${organization.id}/complete-verification`,
        };
    } catch (error) {
        console.error("[createOrganizationAction]", error);
        return { error: "Failed to create organization. Please try again." };
    }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateOrganizationAction(
    organizationId: string,
    data: OrganizationUpdateInput
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const parsed = organizationUpdateSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { hasPermission } = await checkOrganizationPermission(
        session.user.id,
        organizationId,
        "ADMIN"
    );
    if (!hasPermission) return { error: "You don't have permission to edit this organization." };

    try {
        const { industryId, tags: tagLabels, ...rest } = parsed.data;
        const updateData: any = { ...rest };

        if (industryId) {
            updateData.industry = { connect: { id: industryId } };
        }

        const organization = await prisma.organization.update({
            where: { id: organizationId },
            data: updateData,
            include: { industry: true },
        });

        if (tagLabels !== undefined) {
            await setOrgTags(organizationId, tagLabels);
        }

        // Re-embed after profile update
        prisma.jobQueue.create({
            data: { type: JobType.EMBED_ORG, payload: { orgId: organization.id } },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_ORG:", err));

        revalidateTag("organizations");
        revalidatePath(`/organizations/${organizationId}`);

        return { success: true, organization };
    } catch (error) {
        console.error("[updateOrganizationAction]", error);
        return { error: "Failed to update organization. Please try again." };
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteOrganizationAction(organizationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const { hasPermission } = await checkOrganizationPermission(
        session.user.id,
        organizationId,
        "OWNER"
    );
    if (!hasPermission) return { error: "Only organization owners can delete the organization." };

    try {
        await prisma.organization.delete({ where: { id: organizationId } });

        revalidateTag("organizations");
        revalidatePath("/dashboard");

        return { success: true };
    } catch (error) {
        console.error("[deleteOrganizationAction]", error);
        return { error: "Failed to delete organization. Please try again." };
    }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function addOrganizationMemberAction(
    organizationId: string,
    formData: FormData
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const parsed = addMemberSchema.safeParse({
        email: formData.get("email"),
        role: formData.get("role") || "MEMBER",
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { hasPermission, role: requesterRole } = await checkOrganizationPermission(
        session.user.id,
        organizationId,
        "ADMIN"
    );
    if (!hasPermission) return { error: "Only admins and owners can add members." };

    const { email, role: newRole } = parsed.data;

    // ── Phase 11: Role governance ────────────────────────────────────────────

    // OWNER can never be assigned directly — must use Transfer Ownership action
    if (newRole === "OWNER") {
        return { error: "Cannot assign OWNER role directly. Use the Transfer Ownership action instead." };
    }

    // Only OWNER can assign ADMIN
    if (newRole === "ADMIN" && requesterRole !== "OWNER") {
        return { error: "Only owners can assign the admin role." };
    }

    // Enforce max 5 admins per organization
    if (newRole === "ADMIN") {
        const adminCount = await prisma.organizationMember.count({
            where: { organizationId, role: "ADMIN" },
        });
        if (adminCount >= MAX_ADMINS) {
            return { error: `Organization can have at most ${MAX_ADMINS} admins.` };
        }
    }

    // ────────────────────────────────────────────────────────────────────────

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return { error: "No account found with that email address." };

        const existing = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId: user.id, organizationId } },
        });
        if (existing) return { error: "This user is already a member of the organization." };

        const member = await prisma.organizationMember.create({
            data: { userId: user.id, organizationId, role: newRole as OrganizationRole },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });

        revalidatePath(`/organizations/${organizationId}`);
        return { success: true, member };
    } catch (error) {
        console.error("[addOrganizationMemberAction]", error);
        return { error: "Failed to add member. Please try again." };
    }
}

export async function removeOrganizationMemberAction(
    organizationId: string,
    memberIdToRemove: string
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const { hasPermission } = await checkOrganizationPermission(
        session.user.id,
        organizationId,
        "OWNER"
    );
    if (!hasPermission) return { error: "Only owners can remove members." };

    // Prevent removing self if the only owner
    if (session.user.id === memberIdToRemove) {
        const ownerCount = await prisma.organizationMember.count({
            where: { organizationId, role: "OWNER" },
        });
        if (ownerCount === 1) {
            return { error: "Cannot remove yourself as the only owner. Transfer ownership first." };
        }
    }

    try {
        await prisma.organizationMember.delete({
            where: { userId_organizationId: { userId: memberIdToRemove, organizationId } },
        });
        revalidatePath(`/organizations/${organizationId}`);
        return { success: true };
    } catch (error) {
        console.error("[removeOrganizationMemberAction]", error);
        return { error: "Failed to remove member. Please try again." };
    }
}

// ─── Transfer Ownership (Phase 11) ────────────────────────────────────────────

/**
 * Atomically transfers organization ownership from the current owner to a
 * target member. The current owner is demoted to ADMIN. The organization
 * can have only one OWNER at any time.
 */
export async function transferOrganizationOwnershipAction(
    organizationId: string,
    targetUserId: string
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    // Only the current OWNER can transfer ownership
    const { hasPermission } = await checkOrganizationPermission(
        session.user.id,
        organizationId,
        "OWNER"
    );
    if (!hasPermission) return { error: "Only the current owner can transfer ownership." };

    // Cannot transfer to self
    if (session.user.id === targetUserId) {
        return { error: "You are already the owner of this organization." };
    }

    // Target must already be a member
    const targetMember = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: targetUserId, organizationId } },
    });
    if (!targetMember) {
        return { error: "The target user is not a member of this organization." };
    }

    try {
        await prisma.$transaction([
            // Demote current owner to ADMIN
            prisma.organizationMember.update({
                where: { userId_organizationId: { userId: session.user.id!, organizationId } },
                data: { role: "ADMIN" },
            }),
            // Promote target member to OWNER
            prisma.organizationMember.update({
                where: { userId_organizationId: { userId: targetUserId, organizationId } },
                data: { role: "OWNER" },
            }),
        ]);

        revalidatePath(`/organizations/${organizationId}`);
        return { success: true };
    } catch (error) {
        console.error("[transferOrganizationOwnershipAction]", error);
        return { error: "Failed to transfer ownership. Please try again." };
    }
}
