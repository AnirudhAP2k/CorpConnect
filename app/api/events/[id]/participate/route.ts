import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// POST /api/events/[id]/participate - Join event
export const POST = async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        const eventId = params.id;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user with organization
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                organizationId: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch event
        const event = await prisma.events.findUnique({
            where: { id: eventId },
            include: {
                participations: {
                    where: { userId },
                },
                organization: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Check if already participating
        if (event.participations.length > 0) {
            return NextResponse.json(
                { error: "You are already registered for this event" },
                { status: 400 }
            );
        }

        // Check visibility permissions
        if (event.visibility === "PRIVATE") {
            const isMember = event.organization?.members.length || 0 > 0;
            if (!isMember) {
                return NextResponse.json(
                    { error: "This event is only for organization members" },
                    { status: 403 }
                );
            }
        }

        // Check capacity
        if (event.maxAttendees && event.attendeeCount >= event.maxAttendees) {
            return NextResponse.json(
                { error: "Event is full" },
                { status: 400 }
            );
        }

        // Create participation
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.create({
                data: {
                    eventId,
                    userId,
                    organizationId: user.organizationId,
                    status: "REGISTERED",
                },
            });

            // Increment attendee count
            await tx.events.update({
                where: { id: eventId },
                data: {
                    attendeeCount: {
                        increment: 1,
                    },
                },
            });
        });

        revalidatePath(`/events/${eventId}`);

        return NextResponse.json(
            { message: "Successfully joined event!" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Join event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE /api/events/[id]/participate - Leave event
export const DELETE = async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        const eventId = params.id;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find participation
        const participation = await prisma.eventParticipation.findFirst({
            where: {
                eventId,
                userId,
            },
        });

        if (!participation) {
            return NextResponse.json(
                { error: "You are not registered for this event" },
                { status: 404 }
            );
        }

        // Delete participation and decrement count
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.delete({
                where: { id: participation.id },
            });

            await tx.events.update({
                where: { id: eventId },
                data: {
                    attendeeCount: {
                        decrement: 1,
                    },
                },
            });
        });

        revalidatePath(`/events/${eventId}`);

        return NextResponse.json(
            { message: "Successfully left event" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Leave event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
