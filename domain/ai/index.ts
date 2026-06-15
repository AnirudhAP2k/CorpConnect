/**
 * Public API for the AI domain.
 *
 * Import from "@/domain/ai" for all consumer code
 * (UI components, API routes, other domains).
 */

// Types
export type { AiQuotaCheckResult, AiFeatureType } from "./types";
export { PLAN_RANK } from "./types";

// Quota enforcement (used by API routes and other domains)
export { checkAiQuota, deductAiUsage, getAiUsageStats } from "./quota";

// Server Actions (authenticated, quota-gated mutations)
export {
    useAIFeature,
    getAdminAIStats,
    sendChatMessage,
    getChatHistory,
    getExistingSession,
    generateEventDescription,
    getMatchmakingReason,
} from "./actions";
