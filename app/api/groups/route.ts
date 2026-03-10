import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getGroups } from "@/data/groups";
import { createGroupSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.activeOrganizationId;
        if (!orgId) {
            return NextResponse.json({ error: "No active organization" }, { status: 403 });
        }

        // Optional filtering by industry
        const { searchParams } = new URL(req.url);
        const industryId = searchParams.get('industryId') || undefined;

        const groups = await getGroups(orgId, industryId);

        return NextResponse.json(groups);
    } catch (error) {
        console.error("[GET_GROUPS]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orgId = session.user.activeOrganizationId;
        if (!orgId) {
            return NextResponse.json({ error: "No active organization" }, { status: 403 });
        }

        // Verify role
        const member = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                }
            }
        });


        if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
            return NextResponse.json({ error: "Only admins can create groups" }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = createGroupSchema.parse(body);

        // Verify industry exists
        const industry = await prisma.industry.findUnique({
            where: { id: validatedData.industryId }
        });

        if (!industry) {
            return NextResponse.json({ error: "Industry not found" }, { status: 404 });
        }

        // Create group and add creator's org as first member/admin
        const group = await prisma.industryGroup.create({
            data: {
                name: validatedData.name,
                description: validatedData.description,
                industryId: validatedData.industryId,
                logo: validatedData.logo,
                createdById: userId,
                members: {
                    create: {
                        organizationId: orgId,
                        role: "OWNER" // first org gets OWNER
                    }
                }
            }
        });

        return NextResponse.json(group);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        console.error("[POST_GROUPS]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
