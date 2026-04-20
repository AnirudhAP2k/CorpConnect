import { prisma } from "@/lib/db";
import { EventSubmitSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { JobType } from "@prisma/client";
import { assertVerifiedOrgSync } from "@/lib/org-guards";

export const POST = async (req: NextRequest) => {
    try {
        const data = await req.json();

        const validated = EventSubmitSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json(
                { error: "Invalid event information", details: validated.error.errors },
                { status: 400 }
            );
        }

        const { imageUrl, organizationId, ...restData } = validated.data;

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { isVerified: true, name: true },
        });

        if (!organization) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const guard = assertVerifiedOrgSync(organization.isVerified, organization.name);
        if (guard) return guard;

        const event = await prisma.events.create({
            data: {
                ...restData,
                image: imageUrl,
                organizationId,
                attendeeCount: 0,
            }
        });

        if (!event) {
            return NextResponse.json({ error: "Event creation failed" }, { status: 400 });
        }

        revalidatePath('/events');

        // Enqueue embedding job — handler fetches & builds the text itself
        prisma.jobQueue.create({
            data: {
                type: JobType.EMBED_EVENT,
                payload: { eventId: event.id },
            },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_EVENT:", err));

        return NextResponse.json(
            { message: "Event created successfully!", eventId: event.id },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Event creation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = req.nextUrl;
        const eventId = searchParams.get("id");

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        const event = await prisma.events.findUnique({
            where: { id: eventId },
            include: {
                category: true,
                // organizer: true,
            }
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        return NextResponse.json(event, { status: 200 });
    } catch (error) {
        console.error("Event retrieval error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const DELETE = async (req: NextRequest) => {
    try {
        const { searchParams } = req.nextUrl;
        const eventId = searchParams.get("id");
        const path = searchParams.get("path");

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        const event = await prisma.events.delete({
            where: { id: eventId }
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        revalidatePath(path ?? "/");

        return NextResponse.json({ message: 'Event deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error("Event retrieval error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
