import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EventSubmitSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getEventByIdWithMemberCheck } from "@/data/events";

// GET /api/events/[id] - Get single event (already exists in route.ts)

// PUT /api/events/[id] - Update event
export const PUT = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;
        const data = await req.json();

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate input
        const validated = EventSubmitSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid event data", details: validated.error.errors },
                { status: 400 }
            );
        }

        // Fetch event with organization
        const event = await getEventByIdWithMemberCheck(eventId, userId);

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Check permissions - only OWNER or ADMIN can edit
        const userMembership = event.organization?.members[0];
        if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
            return NextResponse.json(
                { error: "Only organization owners and admins can edit events" },
                { status: 403 }
            );
        }

        const { imageUrl, organizationId, ...restData } = validated.data;

        // Update event
        const updatedEvent = await prisma.events.update({
            where: { id: eventId },
            data: {
                ...restData,
                image: imageUrl,
            },
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath('/events');

        return NextResponse.json(
            {
                message: "Event updated successfully!",
                event: updatedEvent,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Update event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE /api/events/[id] - Delete event
export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch event with organization
        const event = await prisma.events.findUnique({
            where: { id: eventId },
            include: {
                organization: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
                participations: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Check permissions - only OWNER or ADMIN can delete
        const userMembership = event.organization?.members[0];
        if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
            return NextResponse.json(
                { error: "Only organization owners and admins can delete events" },
                { status: 403 }
            );
        }

        // Delete event (cascade will delete participations)
        await prisma.events.delete({
            where: { id: eventId },
        });

        revalidatePath('/events');
        revalidatePath(`/organizations/${event.organizationId}`);

        return NextResponse.json(
            {
                message: "Event deleted successfully",
                participationsDeleted: event.participations.length,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Delete event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
