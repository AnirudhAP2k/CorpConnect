import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { OrganizationSubmitSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    try {
        const data = await req.json();

        const validated = OrganizationSubmitSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json({ error: "Invalid organization information" }, { status: 400 });
        }

        const { logoUrl, ...restData } = validated.data;
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organization = await prisma.organization.create({
            data: {
                ...restData,
                logo: logoUrl,
                createdBy: userId,
                industry: {
                    connect: { id: restData.industryId }
                }
            }
        });

        if (!organization) {
            return NextResponse.json({ error: "Organization creation failed" }, { status: 400 });
        }

        return NextResponse.json({ message: "Organization creation successful!", organization: organization.id }, { status: 200 });
    } catch (error: any) {
        console.error("Organization creation error:", error);
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
