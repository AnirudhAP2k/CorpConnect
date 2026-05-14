import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enqueueMatchingRules } from "@/lib/jobs/automation";

// POST /api/invitations/[id]/accept - Accept invitation
export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: invitationId } = await params;

        const session = await auth();
        const userId = session?.user?.id;
        const userEmail = session?.user?.email;

        if (!userId || !userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch invitation
        const invitation = await prisma.pendingInvite.findUnique({
            where: { id: invitationId },
            include: {
                organization: true,
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { error: "Invitation not found" },
                { status: 404 }
            );
        }

        // Verify email matches
        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            return NextResponse.json(
                { error: "This invitation is not for your email address" },
                { status: 403 }
            );
        }

        // Check if already accepted or expired
        if (invitation.status !== "PENDING") {
            return NextResponse.json(
                { error: `Invitation already ${invitation.status.toLowerCase()}` },
                { status: 400 }
            );
        }

        // Check if expired
        if (new Date() > invitation.expiresAt) {
            await prisma.pendingInvite.update({
                where: { id: invitationId },
                data: { status: "EXPIRED" },
            });
            return NextResponse.json(
                { error: "Invitation has expired" },
                { status: 400 }
            );
        }

        // Check if user is already a member
        const existingMember = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: invitation.organizationId,
                },
            },
        });

        if (existingMember) {
            // Update invitation status but don't error
            await prisma.pendingInvite.update({
                where: { id: invitationId },
                data: { status: "ACCEPTED" },
            });
            return NextResponse.json(
                { message: "You are already a member of this organization" },
                { status: 200 }
            );
        }

        // Create membership and update invitation in transaction
        await prisma.$transaction([
            prisma.organizationMember.create({
                data: {
                    userId,
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                },
            }),
            prisma.pendingInvite.update({
                where: { id: invitationId },
                data: { status: "ACCEPTED" },
            }),
        ]);

        // Fire automation rules for the org
        enqueueMatchingRules("NEW_MEMBER_JOINED", invitation.organizationId, {
            userId,
            email: userEmail,
            role: invitation.role,
            invitationId,
        }).catch(() => { });

        revalidatePath("/invitations");
        revalidatePath(`/organizations/${invitation.organizationId}`);

        return NextResponse.json(
            {
                message: `Successfully joined ${invitation.organization.name}!`,
                organizationId: invitation.organizationId,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Accept invitation error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
