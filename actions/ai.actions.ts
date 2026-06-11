"use server";

/**
 * actions/ai.actions.ts
 *
 * Backward-compatibility bridge — re-exports from the canonical
 * domain/ai module. Existing imports from "@/actions/ai.actions"
 * continue to work without modification.
 *
 * New code should import directly from "@/domain/ai".
 */

export {
    useAIFeature,
    getAdminAIStats,
    sendChatMessage,
    getChatHistory,
    getExistingSession,
    generateEventDescription,
    getMatchmakingReason,
} from "@/domain/ai";
