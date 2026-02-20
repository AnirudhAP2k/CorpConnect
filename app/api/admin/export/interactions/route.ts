import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/admin/export/interactions — org→org interaction graph for AI
export const GET = async () => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAppAdmin: true },
    });

    if (!user?.isAppAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const interactions = await prisma.orgInteraction.findMany({
        select: {
            sourceOrgId: true,
            targetOrgId: true,
            sharedEventId: true,
            createdAt: true,
            sourceOrg: { select: { id: true, name: true, industryId: true, size: true } },
            targetOrg: { select: { id: true, name: true, industryId: true, size: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Build graph edges summary
    const edgeCounts = interactions.reduce<Record<string, number>>((acc, row) => {
        const key = `${row.sourceOrgId}:::${row.targetOrgId}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    const graph = Object.entries(edgeCounts).map(([key, weight]) => {
        const [sourceOrgId, targetOrgId] = key.split(":::");
        return { sourceOrgId, targetOrgId, sharedEvents: weight };
    });

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        edgeCount: graph.length,
        rawInteractions: interactions,
        graph,
    });
};
