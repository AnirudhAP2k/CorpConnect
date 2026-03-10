import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const params = await context.params;
        const groupId = params.id;

        const orgMember = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                }
            }
        });

        if (!orgMember || (orgMember.role !== "OWNER" && orgMember.role !== "ADMIN")) {
            return NextResponse.json({ error: "Must be admin to join groups" }, { status: 403 });
        }

        const group = await prisma.industryGroup.findUnique({
            where: { id: groupId }
        });

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const member = await prisma.industryGroupMember.create({
            data: {
                groupId,
                organizationId: orgId,
                role: "MEMBER"
            }
        });

        return NextResponse.json(member);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Already a member" }, { status: 400 });
        }
        console.error("[POST_GROUP_MEMBERS]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
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

        const params = await context.params;
        const groupId = params.id;

        const orgMember = await prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                }
            }
        });

        if (!orgMember || (orgMember.role !== "OWNER" && orgMember.role !== "ADMIN")) {
            return NextResponse.json({ error: "Must be admin to leave groups" }, { status: 403 });
        }

        await prisma.industryGroupMember.delete({
            where: {
                groupId_organizationId: {
                    groupId,
                    organizationId: orgId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE_GROUP_MEMBERS]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
