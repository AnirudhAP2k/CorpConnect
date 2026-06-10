/**
 * lib/jobs/report-generator.ts
 *
 * Phase 14 — Post-Event Report Generation Job
 *
 * Triggered as a GENERATE_REPORT job 24 hours after event.endDateTime.
 * Enterprise-only: silently skips if the hosting org is not on ENTERPRISE plan.
 *
 * Flow:
 *   1. Fetch event + hosting org metadata
 *   2. Enterprise gate check
 *   3. Idempotency check (skip if EventReport already exists)
 *   4. Aggregate metrics from EventParticipation, EventView, EventFeedback
 *   5. Call AI service for executive summary
 *   6. Write EventReport record
 *   7. Email report to all OWNER + ADMIN members of the hosting org
 */

import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";
import { sendEventReportEmail } from "@/lib/email-templates/event-report";
import { format } from "date-fns";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface GenerateReportPayload {
    eventId: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function processEventReport(payload: GenerateReportPayload): Promise<void> {
    const { eventId } = payload;

    // ── 1. Fetch event + org ────────────────────────────────────────────────
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        include: {
            organization: {
                select: {
                    id: true,
                    name: true,
                    subscriptionPlan: true,
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        select: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
            },
        },
    });

    if (!event) {
        console.warn(`[report-generator] ⚠ Event ${eventId} not found — skipping.`);
        return;
    }

    // Destructure org once to satisfy strictNullChecks throughout
    const org = event.organization!;

    // ── 2. Enterprise gate ──────────────────────────────────────────────────
    if (org.subscriptionPlan !== "ENTERPRISE") {
        console.log(`[report-generator] ⏭ Org ${org.id} is not ENTERPRISE — skipping report.`);
        return;
    }

    // ── 3. Idempotency: skip if report already generated ────────────────────
    const existing = await prisma.eventReport.findUnique({ where: { eventId } });
    if (existing) {
        console.log(`[report-generator] ⏭ Report for event ${eventId} already exists — skipping.`);
        return;
    }

    // ── 4. Aggregate metrics ─────────────────────────────────────────────────

    // Registrations & attendance
    const [registrations, attended] = await Promise.all([
        prisma.eventParticipation.count({
            where: { eventId },
        }),
        prisma.eventParticipation.count({
            where: { eventId, attendedAt: { not: null } },
        }),
    ]);

    const attendanceRate = registrations > 0 ? attended / registrations : 0;

    // Views & avg watch duration
    const viewAgg = await prisma.eventView.aggregate({
        where: { eventId },
        _count: { id: true },
        _avg: { durationSeconds: true },
    });
    const viewsCount = viewAgg._count.id;
    const avgDurationSecs = viewAgg._avg.durationSeconds
        ? Math.round(viewAgg._avg.durationSeconds)
        : null;

    // Feedback aggregation
    const feedbacks = await prisma.eventFeedback.findMany({
        where: { eventId },
        select: {
            feedbackText: true,
            rating: true,
            sentiment: true,
            sentimentScore: true,
            themes: true,
        },
    });

    const ratedFeedbacks = feedbacks.filter((f) => f.rating !== null);
    const avgRating = ratedFeedbacks.length > 0
        ? ratedFeedbacks.reduce((s, f) => s + (f.rating ?? 0), 0) / ratedFeedbacks.length
        : null;

    const scoredFeedbacks = feedbacks.filter((f) => f.sentimentScore !== null);
    const avgSentimentScore = scoredFeedbacks.length > 0
        ? scoredFeedbacks.reduce((s, f) => s + (f.sentimentScore ?? 0), 0) / scoredFeedbacks.length
        : null;

    // Sentiment distribution
    const posCount = feedbacks.filter((f) => f.sentiment === "POSITIVE").length;
    const neuCount = feedbacks.filter((f) => f.sentiment === "NEUTRAL").length;
    const negCount = feedbacks.filter((f) => f.sentiment === "NEGATIVE").length;
    const totalSent = posCount + neuCount + negCount;
    const sentimentDistribution = totalSent > 0
        ? {
            positive: Math.round((posCount / totalSent) * 100),
            neutral: Math.round((neuCount / totalSent) * 100),
            negative: Math.round((negCount / totalSent) * 100),
        }
        : { positive: 0, neutral: 0, negative: 0 };

    // Top themes (frequency count across all feedback)
    const themeFreq: Record<string, number> = {};
    for (const fb of feedbacks) {
        for (const theme of fb.themes ?? []) {
            themeFreq[theme] = (themeFreq[theme] ?? 0) + 1;
        }
    }
    const topThemes = Object.entries(themeFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([theme]) => theme);

    // Feedback text samples for AI (non-empty only)
    const feedbackSamples = feedbacks
        .filter((f) => f.feedbackText && f.feedbackText.trim().length > 10)
        .map((f) => f.feedbackText as string)
        .slice(0, 20);

    // ── 5. AI executive summary ──────────────────────────────────────────────
    let aiExecutiveSummary = "AI executive summary not available. Please review metrics above.";
    let overallScore = 0;

    const summaryResult = await aiService.generateEventSummary({
        eventId,
        eventTitle: event.title,
        totalAttendees: attended,
        attendanceRate,
        avgRating,
        sentimentScore: avgSentimentScore,
        feedbackSamples,
        topThemes,
    });

    if (summaryResult) {
        aiExecutiveSummary = summaryResult.executiveSummary;
        overallScore = summaryResult.overallScore;
        // Merge AI-detected top themes if available
        if (summaryResult.strengths.length > 0) {
            console.log(`[report-generator] ✓ AI summary generated — score: ${overallScore}`);
        }
    } else {
        console.warn(`[report-generator] ⚠ AI service unavailable — using placeholder summary.`);
    }

    // ── 6. Write EventReport ─────────────────────────────────────────────────
    await prisma.eventReport.create({
        data: {
            eventId,
            totalRegistrations: registrations,
            totalAttendance: attended,
            attendanceRate,
            avgDurationSecs,
            viewsCount,
            avgRating,
            sentimentScore: avgSentimentScore,
            sentimentDistribution,
            topThemes,
            aiExecutiveSummary,
        },
    });

    console.log(`[report-generator] ✓ EventReport written for event ${eventId}`);

    // ── 7. Email all org admins/owners ───────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://corpconnect.app";
    const reportUrl = `${appUrl}/events/${eventId}/report`;
    const eventDate = event.startDateTime
        ? format(event.startDateTime, "MMMM d, yyyy")
        : "Date TBD";
    const avgDurationMins = avgDurationSecs !== null ? Math.round(avgDurationSecs / 60) : null;

    const recipients = org.members
        .map((m) => m.user)
        .filter((u): u is { id: string; name: string | null; email: string } => !!u.email);

    await Promise.allSettled(
        recipients.map((recipient) =>
            sendEventReportEmail({
                recipientEmail: recipient.email,
                recipientName: recipient.name,
                eventId,
                eventTitle: event.title,
                eventDate,
                organizationName: org.name,
                totalRegistrations: registrations,
                totalAttendance: attended,
                attendanceRate,
                avgRating,
                avgDurationMins,
                viewsCount,
                sentimentScore: avgSentimentScore,
                sentimentDistribution,
                topThemes,
                aiExecutiveSummary,
                reportUrl,
            }),
        ),
    );

    console.log(`[report-generator] ✓ Report emails sent to ${recipients.length} recipients.`);
}
