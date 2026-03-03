import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/admin/export/participations — event participation data for AI training
export const GET = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify app admin
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAppAdmin: true },
    });

    if (!user?.isAppAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const participations = await prisma.eventParticipation.findMany({
        select: {
            id: true,
            userId: true,
            eventId: true,
            organizationId: true,
            status: true,
            isPaid: true,
            registeredAt: true,
            attendedAt: true,
            cancelledAt: true,
            event: {
                select: {
                    id: true,
                    title: true,
                    categoryId: true,
                    eventType: true,
                    visibility: true,
                    organizationId: true,
                    startDateTime: true,
                    viewCount: true,
                    attendeeCount: true,
                },
            },
        },
        orderBy: { registeredAt: "desc" },
    });

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        count: participations.length,
        data: participations,
    });
};
