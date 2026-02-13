import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for updating member role
const UpdateMemberRoleSchema = z.object({
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

// PUT /api/organizations/[id]/members/[memberId] - Update member role
export const PUT = async (
    req: NextRequest,
    { params }: { params: { id: string; memberId: string } }
) => {
    try {
        const { id: organizationId, memberId } = params;
        const data = await req.json();

        const validated = UpdateMemberRoleSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid data", details: validated.error.errors },
                { status: 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only OWNER can change roles
        const requesterMembership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: "OWNER",
            },
        });

        if (!requesterMembership) {
            return NextResponse.json(
                { error: "Only organization owners can change member roles" },
                { status: 403 }
            );
        }

        // Update member role
        const member = await prisma.organizationMember.update({
            where: {
                id: memberId,
            },
            data: {
                role: validated.data.role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                message: "Member role updated successfully",
                member,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Update member role error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE /api/organizations/[id]/members/[memberId] - Remove member
export const DELETE = async (
    req: NextRequest,
    { params }: { params: { id: string; memberId: string } }
) => {
    try {
        const { id: organizationId, memberId } = params;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only OWNER can remove members
        const requesterMembership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: "OWNER",
            },
        });

        if (!requesterMembership) {
            return NextResponse.json(
                { error: "Only organization owners can remove members" },
                { status: 403 }
            );
        }

        // Get member to remove
        const memberToRemove = await prisma.organizationMember.findUnique({
            where: { id: memberId },
        });

        if (!memberToRemove) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Prevent removing the last OWNER
        if (memberToRemove.role === "OWNER") {
            const ownerCount = await prisma.organizationMember.count({
                where: {
                    organizationId,
                    role: "OWNER",
                },
            });

            if (ownerCount <= 1) {
                return NextResponse.json(
                    {
                        error:
                            "Cannot remove the last owner. Assign another owner first.",
                    },
                    { status: 400 }
                );
            }
        }

        // Remove member
        await prisma.organizationMember.delete({
            where: { id: memberId },
        });

        // Update user's organizationId to null
        await prisma.user.update({
            where: { id: memberToRemove.userId },
            data: { organizationId: null },
        });

        return NextResponse.json(
            { message: "Member removed successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Remove member error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
