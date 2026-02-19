import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/user/active-organization - Set active organization
export const POST = async (req: NextRequest) => {
    try {
        const { organizationId } = await req.json();

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!organizationId) {
            return NextResponse.json(
                { error: "Organization ID is required" },
                { status: 400 }
            );
        }

        // Verify user is member of the organization
        const membership = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId,
                },
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: "You are not a member of this organization" },
                { status: 403 }
            );
        }

        // Update user's active organization
        await prisma.user.update({
            where: { id: userId },
            data: { activeOrganizationId: organizationId },
        });

        return NextResponse.json(
            {
                message: `Switched to ${membership.organization.name}`,
                organization: membership.organization,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Set active organization error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
