import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getGroupFeed } from "@/data/groups";
import { z } from "zod";
import { createPostSchema } from "@/lib/validation";

export async function GET(
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

        const posts = await getGroupFeed(groupId, orgId);

        return NextResponse.json(posts);
    } catch (error) {
        console.error("[GET_GROUP_POSTS]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

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

        const member = await prisma.industryGroupMember.findUnique({
            where: {
                groupId_organizationId: {
                    groupId,
                    organizationId: orgId
                }
            }
        });

        if (!member) {
            return NextResponse.json({ error: "Must be a member to post" }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = createPostSchema.parse(body);

        const post = await prisma.groupPost.create({
            data: {
                content: validatedData.content,
                groupId,
                authorOrgId: orgId,
                authorUserId: userId
            },
            include: {
                authorOrg: { select: { id: true, name: true, logo: true } },
                authorUser: { select: { id: true, name: true, image: true } }
            }
        });

        return NextResponse.json(post);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        console.error("[POST_GROUP_POST]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
