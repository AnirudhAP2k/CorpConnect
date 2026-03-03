import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/admin/export/preferences — per-user preference signals for AI
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

    // Participation-based signals (strong: actually attended)
    const participations = await prisma.eventParticipation.findMany({
        select: {
            userId: true,
            status: true,
            event: {
                select: {
                    categoryId: true,
                    eventType: true,
                    organizationId: true,
                    organization: { select: { industryId: true, size: true } },
                },
            },
        },
    });

    // View-based signals (weak: browsed but didn't join)
    const views = await prisma.eventView.findMany({
        select: {
            userId: true,
            durationSeconds: true,
            referrer: true,
            event: {
                select: {
                    categoryId: true,
                    eventType: true,
                    organization: { select: { industryId: true, size: true } },
                },
            },
        },
    });

    // Aggregate per-user preference signals
    const userSignals: Record<string, {
        userId: string;
        categoryFrequency: Record<string, number>;
        industryFrequency: Record<string, number>;
        eventTypeFrequency: Record<string, number>;
        avgViewDuration: number;
        totalViews: number;
        attendedCount: number;
        cancelledCount: number;
    }> = {};

    const ensureUser = (userId: string) => {
        if (!userSignals[userId]) {
            userSignals[userId] = {
                userId,
                categoryFrequency: {},
                industryFrequency: {},
                eventTypeFrequency: {},
                avgViewDuration: 0,
                totalViews: 0,
                attendedCount: 0,
                cancelledCount: 0,
            };
        }
        return userSignals[userId];
    };

    for (const p of participations) {
        const u = ensureUser(p.userId);
        const cat = p.event.categoryId;
        const ind = p.event.organization?.industryId ?? "unknown";
        const evType = p.event.eventType;
        u.categoryFrequency[cat] = (u.categoryFrequency[cat] ?? 0) + 1;
        u.industryFrequency[ind] = (u.industryFrequency[ind] ?? 0) + 1;
        u.eventTypeFrequency[evType] = (u.eventTypeFrequency[evType] ?? 0) + 1;
        if (p.status === "ATTENDED") u.attendedCount++;
        if (p.status === "CANCELLED") u.cancelledCount++;
    }

    const viewDurations: Record<string, number[]> = {};
    for (const v of views) {
        const u = ensureUser(v.userId);
        u.totalViews++;
        const cat = v.event.categoryId;
        const ind = v.event.organization?.industryId ?? "unknown";
        const evType = v.event.eventType;
        u.categoryFrequency[cat] = (u.categoryFrequency[cat] ?? 0) + 0.3; // weak signal
        u.industryFrequency[ind] = (u.industryFrequency[ind] ?? 0) + 0.3;
        u.eventTypeFrequency[evType] = (u.eventTypeFrequency[evType] ?? 0) + 0.3;
        if (v.durationSeconds) {
            if (!viewDurations[v.userId]) viewDurations[v.userId] = [];
            viewDurations[v.userId].push(v.durationSeconds);
        }
    }

    // Compute avg view duration per user
    for (const [userId, durations] of Object.entries(viewDurations)) {
        if (userSignals[userId] && durations.length > 0) {
            userSignals[userId].avgViewDuration = Math.round(
                durations.reduce((a, b) => a + b, 0) / durations.length
            );
        }
    }

    return NextResponse.json({
        exportedAt: new Date().toISOString(),
        userCount: Object.keys(userSignals).length,
        data: Object.values(userSignals),
    });
};
