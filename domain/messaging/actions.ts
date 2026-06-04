"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { assertEnterpriseSubscription } from "./queries";

// ─── Create Group ─────────────────────────────────────────────────────────────

/**
 * Creates a new Enterprise group conversation.
 * The creating user is automatically added as OWNER.
 */
export async function createGroupAction(data: {
    name: string;
    description?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const orgId = session.user.activeOrganizationId;
    if (!orgId) return { error: "No active organization selected." };

    if (!data.name?.trim()) return { error: "Group name is required." };
    if (data.name.trim().length > 80) return { error: "Group name must be at most 80 characters." };

    try {
        await assertEnterpriseSubscription(orgId);
    } catch (e: any) {
        return { error: e.message };
    }

    try {
        const group = await prisma.$transaction(async (tx) => {
            const g = await tx.groupConversation.create({
                data: {
                    name: data.name.trim(),
                    description: data.description?.trim() ?? null,
                    creatorOrgId: orgId,
                    createdById: session.user!.id!,
                },
            });
            // Auto-add creator as OWNER
            await tx.groupMember.create({
                data: {
                    groupId: g.id,
                    orgId,
                    userId: session.user!.id!,
                    role: "OWNER",
                },
            });
            return g;
        });

        revalidatePath("/messaging/groups");
        return { success: true, groupId: group.id };
    } catch (err) {
        console.error("[createGroupAction]", err);
        return { error: "Failed to create group. Please try again." };
    }
}

// ─── Invite to Group ──────────────────────────────────────────────────────────

/**
 * Sends a group invite to another user. Both orgs must be ENTERPRISE.
 * Only OWNER or ADMIN of the group can send invites.
 */
export async function inviteToGroupAction(data: {
    groupId: string;
    inviteeUserId: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const inviterOrgId = session.user.activeOrganizationId;
    if (!inviterOrgId) return { error: "No active organization selected." };

    // Must be an OWNER or ADMIN of the group
    const requesterMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: session.user.id } },
    });
    if (!requesterMember || !["OWNER", "ADMIN"].includes(requesterMember.role)) {
        return { error: "Only group owners and admins can send invitations." };
    }

    // Get invitee and their org
    const invitee = await prisma.user.findUnique({
        where: { id: data.inviteeUserId },
        select: { id: true, organizationId: true },
    });
    if (!invitee?.organizationId) {
        return { error: "Invitee user not found or has no organization." };
    }

    // Both orgs must be ENTERPRISE
    try {
        await Promise.all([
            assertEnterpriseSubscription(inviterOrgId),
            assertEnterpriseSubscription(invitee.organizationId),
        ]);
    } catch (e: any) {
        return { error: e.message };
    }

    // Check for duplicate invite or existing membership
    const [existingMember, existingInvite] = await Promise.all([
        prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId: data.groupId, userId: data.inviteeUserId } },
        }),
        prisma.groupInvite.findUnique({
            where: { groupId_inviteeUserId: { groupId: data.groupId, inviteeUserId: data.inviteeUserId } },
        }),
    ]);

    if (existingMember) return { error: "This user is already a member of the group." };
    if (existingInvite?.status === "PENDING") {
        return { error: "An invitation has already been sent to this user." };
    }

    try {
        // Upsert the invite (re-send if previously rejected/expired)
        const invite = await prisma.groupInvite.upsert({
            where: { groupId_inviteeUserId: { groupId: data.groupId, inviteeUserId: data.inviteeUserId } },
            create: {
                groupId: data.groupId,
                inviterOrgId,
                inviterUserId: session.user.id,
                inviteeOrgId: invitee.organizationId,
                inviteeUserId: data.inviteeUserId,
                status: "PENDING",
            },
            update: { status: "PENDING", inviterOrgId, inviterUserId: session.user.id },
        });

        return { success: true, inviteId: invite.id };
    } catch (err) {
        console.error("[inviteToGroupAction]", err);
        return { error: "Failed to send invitation. Please try again." };
    }
}

// ─── Accept Group Invite ──────────────────────────────────────────────────────

/**
 * Invitee accepts a pending group invitation.
 * Atomically transitions invite to ACCEPTED and inserts a GroupMember record.
 */
export async function acceptGroupInviteAction(inviteId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const invite = await prisma.groupInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { error: "Invitation not found." };
    if (invite.inviteeUserId !== session.user.id) return { error: "This invitation is not for you." };
    if (invite.status !== "PENDING") return { error: "This invitation is no longer active." };

    // Verify invitee org still has ENTERPRISE plan
    try {
        await assertEnterpriseSubscription(invite.inviteeOrgId);
    } catch (e: any) {
        return { error: e.message };
    }

    try {
        await prisma.$transaction([
            // Mark invite as accepted
            prisma.groupInvite.update({
                where: { id: inviteId },
                data: { status: "ACCEPTED" },
            }),
            // Add user as MEMBER
            prisma.groupMember.create({
                data: {
                    groupId: invite.groupId,
                    orgId: invite.inviteeOrgId,
                    userId: invite.inviteeUserId,
                    role: "MEMBER",
                },
            }),
        ]);

        revalidatePath("/messaging/groups");
        return { success: true, groupId: invite.groupId };
    } catch (err) {
        console.error("[acceptGroupInviteAction]", err);
        return { error: "Failed to accept invitation. Please try again." };
    }
}

// ─── Reject Group Invite ──────────────────────────────────────────────────────

/**
 * Invitee declines a pending group invitation.
 */
export async function rejectGroupInviteAction(inviteId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const invite = await prisma.groupInvite.findUnique({ where: { id: inviteId } });
    if (!invite) return { error: "Invitation not found." };
    if (invite.inviteeUserId !== session.user.id) return { error: "This invitation is not for you." };
    if (invite.status !== "PENDING") return { error: "This invitation is no longer active." };

    try {
        await prisma.groupInvite.update({
            where: { id: inviteId },
            data: { status: "REJECTED" },
        });
        return { success: true };
    } catch (err) {
        console.error("[rejectGroupInviteAction]", err);
        return { error: "Failed to reject invitation. Please try again." };
    }
}

// ─── Leave Group ──────────────────────────────────────────────────────────────

/**
 * Removes the calling user from a group they are a member of.
 * OWNER cannot leave — they must transfer ownership or dissolve the group first.
 */
export async function leaveGroupAction(groupId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized." };

    const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: session.user.id } },
    });
    if (!member) return { error: "You are not a member of this group." };

    if (member.role === "OWNER") {
        return {
            error: "Group owners cannot leave. Transfer ownership to another member or delete the group first.",
        };
    }

    try {
        await prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId: session.user.id } },
        });

        revalidatePath("/messaging/groups");
        return { success: true };
    } catch (err) {
        console.error("[leaveGroupAction]", err);
        return { error: "Failed to leave group. Please try again." };
    }
}
