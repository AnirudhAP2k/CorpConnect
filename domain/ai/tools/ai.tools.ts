import { getAiUsageStats } from "@/domain/ai/quota";
import { generateEventDescription } from "@/domain/ai/actions";
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

export async function generateEventDescriptionHandler({ orgId, toolArgs }: ToolContext) {
    const roughDraft = String(toolArgs.roughDraft || "");
    const eventId = toolArgs.eventId ? String(toolArgs.eventId) : undefined;

    if (!roughDraft) throw new Error("roughDraft is required");

    return generateEventDescription(orgId, roughDraft, eventId);
}
