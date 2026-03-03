import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { setEventTags, getEventTags } from "@/data/analytics";

// GET /api/events/[id]/tags
export const GET = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: eventId } = await params;
    const tags = await getEventTags(eventId);
    return NextResponse.json(tags);
};

// PUT /api/events/[id]/tags — set tags on event (event owner/org admin only)
export const PUT = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: eventId } = await params;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check ownership
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: { userId: true, organizationId: true },
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const isOwner = event.userId === userId;
    let isOrgAdmin = false;
    if (event.organizationId) {
        const member = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: event.organizationId } },
            select: { role: true },
        });
        isOrgAdmin = member?.role === "OWNER" || member?.role === "ADMIN";
    }

    if (!isOwner && !isOrgAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tags: string[] = Array.isArray(body.tags) ? body.tags : [];

    await setEventTags(eventId, tags);
    const updatedTags = await getEventTags(eventId);

    return NextResponse.json(updatedTags);
};
