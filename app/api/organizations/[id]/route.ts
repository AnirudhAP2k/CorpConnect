import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for organization update
const OrganizationUpdateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    industryId: z.string().uuid().optional(),
    description: z.string().min(5).max(500).optional(),
    website: z.string().url().optional().or(z.literal("")),
    location: z.string().max(100).optional(),
    size: z.enum(["STARTUP", "SME", "ENTERPRISE"]).optional(),
    logo: z.string().optional(),
});

// GET /api/organizations/[id] - Get organization details
export const GET = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const data = await params;
        const organizationId = data.id;

        if (!organizationId) {
            return NextResponse.json(
                { error: "Organization ID is required" },
                { status: 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                industry: true,
                members: {
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
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                events: {
                    take: 10,
                    orderBy: {
                        startDateTime: "desc",
                    },
                    include: {
                        category: true,
                    },
                },
                _count: {
                    select: {
                        members: true,
                        events: true,
                    },
                },
            },
        });

        if (!organization) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            );
        }

        // Check if user is a member to show sensitive data
        const isMember = organization.members.some(
            (member) => member.userId === userId
        );

        // Hide member emails for non-members
        if (!isMember) {
            organization.members = organization.members.map((member) => ({
                ...member,
                user: {
                    ...member.user,
                    email: null,
                },
            }));
        }

        return NextResponse.json(organization, { status: 200 });
    } catch (error) {
        console.error("Organization retrieval error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// PUT /api/organizations/[id] - Update organization
export const PUT = async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        const organizationId = params.id;
        const data = await req.json();

        const validated = OrganizationUpdateSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid organization data", details: validated.error.errors },
                { status: 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is OWNER or ADMIN
        const membership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: {
                    in: ["OWNER", "ADMIN"],
                },
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: "You don't have permission to edit this organization" },
                { status: 403 }
            );
        }

        // Update organization
        const updateData: any = { ...validated.data };

        // Handle industry update
        if (validated.data.industryId) {
            updateData.industry = {
                connect: { id: validated.data.industryId },
            };
            delete updateData.industryId;
        }

        const organization = await prisma.organization.update({
            where: { id: organizationId },
            data: updateData,
            include: {
                industry: true,
            },
        });

        return NextResponse.json(
            {
                message: "Organization updated successfully",
                organization,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Organization update error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE /api/organizations/[id] - Delete organization (OWNER only)
export const DELETE = async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        const organizationId = params.id;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is OWNER
        const membership = await prisma.organizationMember.findFirst({
            where: {
                organizationId,
                userId,
                role: "OWNER",
            },
        });

        if (!membership) {
            return NextResponse.json(
                { error: "Only organization owners can delete the organization" },
                { status: 403 }
            );
        }

        // Delete organization (cascade will handle members and events)
        await prisma.organization.delete({
            where: { id: organizationId },
        });

        return NextResponse.json(
            { message: "Organization deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Organization deletion error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
