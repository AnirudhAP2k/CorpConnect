import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { OrganizationSubmitSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { JobType } from "@prisma/client";

export const POST = async (req: NextRequest) => {
    try {
        const session = await auth();
        const data = await req.json();

        const userId = session?.user?.id;

        data.logoUrl = data.logo;
        data.createdBy = userId;

        const validated = OrganizationSubmitSchema.safeParse(data);

        if (!validated.success) {
            return NextResponse.json({ error: "Invalid organization information" }, { status: 400 });
        }

        const { logoUrl, industryId, ...restData } = validated.data;

        const userRecord = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        const creatorEmail = userRecord?.email;

        if (!userId || !creatorEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organization = await prisma.organization.create({
            data: {
                ...restData,
                logo: logoUrl,
                industry: { connect: { id: industryId } },
                meta: { create: {} },
            },
        });

        if (!organization) {
            return NextResponse.json({ error: "Organization creation failed" }, { status: 400 });
        }

        prisma.jobQueue.create({
            data: { type: JobType.EMBED_ORG, payload: { orgId: organization.id } },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_ORG:", err));

        prisma.jobQueue.create({
            data: {
                type: JobType.VERIFY_ORG_LEVEL_1,
                payload: { orgId: organization.id, creatorEmail },
            },
        }).catch((err) => console.error("[OrgVerification] Failed to enqueue L1:", err));

        return NextResponse.json(
            {
                success: true,
                message: "Organization created! Complete your KYB documents to unlock all features.",
                organization: organization.id,
                kybUrl: `/organizations/${organization.id}/complete-verification`,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Organization creation error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
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
