"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedbackSummary {
    averageRating: number;
    totalResponses: number;
    sentimentBreakdown: { positive: number; neutral: number; negative: number };
    ratingDistribution: Record<number, number>;
    topThemes: { theme: string; count: number }[];
    recentComments: {
        id: string;
        rating: number;
        feedbackText: string | null;
        sentiment: string | null;
        sentimentScore: number | null;
        aiSummary: string | null;
        createdAt: string;
    }[];
    pendingAnalysis: number;   // feedback rows not yet analysed
}

// ─── Submit Feedback ──────────────────────────────────────────────────────────

export async function submitFeedback(
    eventId: string,
    rating: number,
    feedbackText?: string,
): Promise<{ success: true; feedbackId: string } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    // Verify the user has a participation record for this event
    const participation = await prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
    });

    if (!participation) {
        return { success: false, error: "You must be registered for this event to leave feedback." };
    }
    if (participation.status === "CANCELLED") {
        return { success: false, error: "You cannot leave feedback for a cancelled registration." };
    }

    // Validate rating
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return { success: false, error: "Rating must be a whole number between 1 and 5." };
    }

    // Upsert (allow attendees to update their own feedback)
    const feedback = await prisma.eventFeedback.upsert({
        where: { eventId_userId: { eventId, userId } },
        create: {
            eventId,
            userId,
            rating,
            feedbackText: feedbackText?.trim() || null,
        },
        update: {
            rating,
            feedbackText: feedbackText?.trim() || null,
            // Reset analysis fields so a re-submission triggers a fresh analysis
            sentiment: null,
            sentimentScore: null,
            themes: [],
            aiSummary: null,
            analysedAt: null,
        },
    });

    // Enqueue sentiment analysis job if there is text to analyse
    if (feedback.feedbackText) {
        await prisma.jobQueue.create({
            data: {
                type: "ANALYSE_FEEDBACK_SENTIMENT",
                payload: { feedbackId: feedback.id },
                status: "PENDING",
            },
        });
    }

    return { success: true, feedbackId: feedback.id };
}

// ─── Get User's Own Feedback (for pre-filling the form) ───────────────────────

export async function getUserFeedback(
    eventId: string,
): Promise<{ rating: number; feedbackText: string | null } | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const row = await prisma.eventFeedback.findUnique({
        where: { eventId_userId: { eventId, userId: session.user.id } },
        select: { rating: true, feedbackText: true },
    });
    return row ?? null;
}

// ─── Get Feedback Summary for Org Dashboard ───────────────────────────────────

export async function getEventFeedbackSummary(
    eventId: string,
): Promise<{ success: true; data: FeedbackSummary } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Verify user is a member of the org that hosts this event
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: { organizationId: true },
    });
    if (!event?.organizationId) return { success: false, error: "Event not found." };

    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: event.organizationId } },
    });
    if (!membership) return { success: false, error: "Access denied." };

    // Fetch all feedback for this event
    const allFeedback = await prisma.eventFeedback.findMany({
        where: { eventId },
        select: {
            id: true,
            rating: true,
            feedbackText: true,
            sentiment: true,
            sentimentScore: true,
            themes: true,
            aiSummary: true,
            analysedAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    const total = allFeedback.length;
    if (total === 0) {
        return {
            success: true,
            data: {
                averageRating: 0,
                totalResponses: 0,
                sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                topThemes: [],
                recentComments: [],
                pendingAnalysis: 0,
            },
        };
    }

    // Aggregate stats
    const avgRating = allFeedback.reduce((s: number, f: typeof allFeedback[0]) => s + f.rating, 0) / total;
    const sentBreakdown = { positive: 0, neutral: 0, negative: 0 };
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const themeCounts = new Map<string, number>();
    let pendingAnalysis = 0;

    for (const f of allFeedback) {
        ratingDist[f.rating] = (ratingDist[f.rating] ?? 0) + 1;
        if (f.sentiment === "POSITIVE") sentBreakdown.positive++;
        else if (f.sentiment === "NEUTRAL") sentBreakdown.neutral++;
        else if (f.sentiment === "NEGATIVE") sentBreakdown.negative++;
        if (f.feedbackText && !f.analysedAt) pendingAnalysis++;
        for (const t of f.themes) {
            themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
        }
    }

    const topThemes = [...themeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([theme, count]) => ({ theme, count }));

    const recentComments = allFeedback
        .filter((f: typeof allFeedback[0]) => f.feedbackText)
        .slice(0, 5)
        .map((f: typeof allFeedback[0]) => ({
            id: f.id,
            rating: f.rating,
            feedbackText: f.feedbackText,
            sentiment: f.sentiment,
            sentimentScore: f.sentimentScore,
            aiSummary: f.aiSummary,
            createdAt: f.createdAt.toISOString(),
        }));

    return {
        success: true,
        data: {
            averageRating: Math.round(avgRating * 10) / 10,
            totalResponses: total,
            sentimentBreakdown: sentBreakdown,
            ratingDistribution: ratingDist,
            topThemes,
            recentComments,
            pendingAnalysis,
        },
    };
}

// ─── Get all event feedback summaries for an org ──────────────────────────────

export async function getOrgFeedbackSummary(
    orgId: string,
): Promise<{ success: true; data: (FeedbackSummary & { eventTitle: string; eventId: string })[] } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Verify membership
    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });
    if (!membership) return { success: false, error: "Access denied." };

    // Fetch recent events for this org
    const events = await prisma.events.findMany({
        where: { organizationId: orgId },
        select: { id: true, title: true },
        orderBy: { startDateTime: "desc" },
        take: 10,
    });

    if (events.length === 0) return { success: true, data: [] };

    const eventIds = events.map((e: { id: string }) => e.id);

    // Fetch all feedback for these events in a single query
    const allFb = await prisma.eventFeedback.findMany({
        where: { eventId: { in: eventIds } },
        select: {
            id: true, eventId: true, rating: true, feedbackText: true,
            sentiment: true, sentimentScore: true, themes: true,
            aiSummary: true, analysedAt: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    // Group by eventId
    type FbRow = typeof allFb[0];
    const byEvent = new Map<string, FbRow[]>();
    for (const f of allFb) {
        const arr = byEvent.get(f.eventId) ?? [];
        arr.push(f);
        byEvent.set(f.eventId, arr);
    }

    const results = events.map((ev: { id: string; title: string }) => {
        const fb = byEvent.get(ev.id) ?? [];
        const total = fb.length;
        const avgRating = total > 0 ? fb.reduce((s: number, f: FbRow) => s + f.rating, 0) / total : 0;
        const sentBreak: { positive: number; neutral: number; negative: number } = { positive: 0, neutral: 0, negative: 0 };
        const ratingDist: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const themeCnts = new Map<string, number>();
        let pending = 0;

        for (const f of fb) {
            ratingDist[f.rating as 1 | 2 | 3 | 4 | 5] = (ratingDist[f.rating as 1 | 2 | 3 | 4 | 5] ?? 0) + 1;
            if (f.sentiment === "POSITIVE") sentBreak.positive++;
            else if (f.sentiment === "NEUTRAL") sentBreak.neutral++;
            else if (f.sentiment === "NEGATIVE") sentBreak.negative++;
            if (f.feedbackText && !f.analysedAt) pending++;
            for (const t of f.themes) themeCnts.set(t, (themeCnts.get(t) ?? 0) + 1);
        }

        return {
            eventId: ev.id,
            eventTitle: ev.title,
            averageRating: total > 0 ? Math.round(avgRating * 10) / 10 : 0,
            totalResponses: total,
            sentimentBreakdown: sentBreak,
            ratingDistribution: ratingDist,
            topThemes: [...themeCnts.entries()].sort((a: [string, number], b: [string, number]) => b[1] - a[1]).slice(0, 5).map(([theme, count]: [string, number]) => ({ theme, count })),
            recentComments: fb
                .filter((f: FbRow) => f.feedbackText)
                .slice(0, 3)
                .map((f: FbRow) => ({
                    id: f.id, rating: f.rating, feedbackText: f.feedbackText,
                    sentiment: f.sentiment, sentimentScore: f.sentimentScore,
                    aiSummary: f.aiSummary, createdAt: f.createdAt.toISOString(),
                })),
            pendingAnalysis: pending,
        };
    });

    return { success: true, data: results };
}
