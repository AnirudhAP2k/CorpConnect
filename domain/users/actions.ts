"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { setActiveOrganizationSchema, updateUserProfileSchema } from "./validation";
import type { UpdateUserProfileInput } from "./validation";

// ─── Active organization switch ───────────────────────────────────────────────

/**
 * Switches the calling user's active organization context.
 * Validates that the user is actually a member before switching.
 */
export async function setActiveOrganizationAction(organizationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const parsed = setActiveOrganizationSchema.safeParse({ organizationId });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    try {
        const membership = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId: session.user.id,
                    organizationId: parsed.data.organizationId,
                },
            },
            include: {
                organization: { select: { id: true, name: true, logo: true } },
            },
        });

        if (!membership) {
            return { error: "You are not a member of this organization." };
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeOrganizationId: parsed.data.organizationId },
        });

        return {
            success: true,
            message: `Switched to ${membership.organization.name}`,
            organization: membership.organization,
        };
    } catch (error) {
        console.error("[setActiveOrganizationAction]", error);
        return { error: "Failed to switch organization. Please try again." };
    }
}

// ─── Profile update ───────────────────────────────────────────────────────────

/**
 * Updates the calling user's editable profile fields.
 */
export async function updateUserProfileAction(data: UpdateUserProfileInput) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const parsed = updateUserProfileSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { isTwoFactorEnabled, ...profile } = parsed.data;

    // A cleared field is stored as NULL rather than an empty string.
    const updateData: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(profile)) {
        if (value === undefined) continue;
        updateData[key] = value === "" ? null : value;
    }

    try {
        if (isTwoFactorEnabled !== undefined) {
            const account = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { password: true },
            });

            // Two-factor only runs on the credentials sign-in path.
            if (!account?.password && isTwoFactorEnabled) {
                return { error: "Two-factor authentication requires a password-based account." };
            }

            updateData.isTwoFactorEnabled = isTwoFactorEnabled;
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: { id: true, name: true, email: true, image: true },
        });

        revalidatePath("/profile");
        revalidatePath("/profile/edit");
        return { success: true, user };
    } catch (error) {
        console.error("[updateUserProfileAction]", error);
        return { error: "Failed to update profile. Please try again." };
    }
}
