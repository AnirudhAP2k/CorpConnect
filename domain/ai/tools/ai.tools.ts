import { checkAiQuota, deductAiUsage, getAiUsageStats } from "@/domain/ai/quota";
import { aiService } from "@/lib/ai-service";
import type { ToolContext } from "./types";

export async function searchEventsHandler({ toolArgs }: ToolContext) {
    const query = String(toolArgs.query || "");
    const limit = Number(toolArgs.limit) || 5;
    if (!query) throw new Error("query is required");

    return aiService.semanticSearch(query, limit);
}

export async function getRecommendationsHandler({ userId, orgId, toolArgs }: ToolContext) {
    const recType = String(toolArgs.type || "events");
    const limit = Number(toolArgs.limit) || 5;

    if (recType === "orgs") {
        return aiService.recommendOrgs(orgId, limit);
    }
    return aiService.recommendEvents(userId, limit);
}

export async function getAiUsageStatsHandler({ orgId }: ToolContext) {
    return getAiUsageStats(orgId);
}

/**
 * Agent tool path — membership already verified by /api/internal/agent/[tool].
 * Does NOT call session-gated domain/ai/actions.generateEventDescription.
 */
export async function generateEventDescriptionHandler({ orgId, toolArgs }: ToolContext) {
    const roughDraft = String(toolArgs.roughDraft || "");
    const rawEventId = toolArgs.eventId != null ? String(toolArgs.eventId).trim() : "";
    const eventId = rawEventId || undefined;

    if (!roughDraft) throw new Error("roughDraft is required");

    const quota = await checkAiQuota(orgId, "generateDescription");
    if (!quota.allowed) {
        throw new Error(quota.reason || "AI quota exceeded for description generation");
    }

    const result = await aiService.generateEventDescription(orgId, roughDraft, eventId);
    if (!result) {
        throw new Error(
            "AI service is unavailable or not configured. Please add LLM_API_KEY to the AI service."
        );
    }

    await deductAiUsage(orgId);
    return { success: true, data: result };
}
