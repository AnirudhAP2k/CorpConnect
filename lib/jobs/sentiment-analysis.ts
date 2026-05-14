/**
 * lib/jobs/sentiment-analysis.ts
 *
 * Job handler for ANALYSE_FEEDBACK_SENTIMENT queue entries.
 * Called by the job processor when a feedback record needs AI analysis.
 *
 * Flow:
 *   1. Fetch the EventFeedback row (feedbackText + rating).
 *   2. Call the AI service /analyse/sentiment endpoint.
 *   3. Update EventFeedback with { sentiment, sentimentScore, themes, aiSummary, analysedAt }.
 */

import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";

export interface SentimentJobPayload {
    feedbackId: string;
}

export async function processSentimentAnalysis(payload: SentimentJobPayload): Promise<void> {
    const { feedbackId } = payload;

    const feedback = await prisma.eventFeedback.findUnique({
        where: { id: feedbackId },
        select: { id: true, feedbackText: true, rating: true, analysedAt: true },
    });

    if (!feedback) {
        throw new Error(`[Sentiment] Feedback ${feedbackId} not found.`);
    }
    if (feedback.analysedAt) {
        console.log(`[Sentiment] ⏭ Feedback ${feedbackId} already analysed — skipping.`);
        return;
    }
    const result = await aiService.analyseSentiment({
        feedbackId: feedback.id,
        feedbackText: feedback.feedbackText,
        rating: feedback.rating,
    });

    if (!result) {
        throw new Error(`[Sentiment] AI service returned null for feedback ${feedbackId}.`);
    }

    await prisma.eventFeedback.update({
        where: { id: feedbackId },
        data: {
            sentiment: result.sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
            sentimentScore: result.sentimentScore,
            themes: result.themes,
            aiSummary: result.summary,
            analysedAt: new Date(),
        },
    });

    console.log(
        `[Sentiment] ✓ Analysed feedback ${feedbackId}: ${result.sentiment} (${result.sentimentScore.toFixed(2)}) themes=[${result.themes.join(", ")}]`
    );
}
