import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getGroupEvents } from "@/data/groups";
import { z } from "zod";
import { createGroupEventSchema } from "@/lib/validation";


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

        const events = await getGroupEvents(groupId, orgId);

        return NextResponse.json(events);
    } catch (error) {
        console.error("[GET_GROUP_EVENTS]", error);
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

        // Verify membership
        const member = await prisma.industryGroupMember.findUnique({
            where: {
                groupId_organizationId: {
                    groupId,
                    organizationId: orgId
                }
            }
        });

        if (!member) {
            return NextResponse.json({ error: "Must be a member to share events" }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = createGroupEventSchema.parse(body);

        // Verify event exists
        const event = await prisma.events.findUnique({
            where: { id: validatedData.eventId }
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Create group event
        const groupEvent = await prisma.industryGroupEvent.create({
            data: {
                groupId,
                eventId: validatedData.eventId,
                addedByOrgId: orgId
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organization: { select: { id: true, name: true, logo: true } }
                    }
                },
                addedByOrg: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json(groupEvent);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Event is already shared to this group" }, { status: 400 });
        }
        console.error("[POST_GROUP_EVENT]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
