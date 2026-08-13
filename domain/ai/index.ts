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
    consumeAIFeature,
    getAdminAIStats,
    sendChatMessage,
    getChatHistory,
    getExistingSession,
    generateEventDescription,
    getMatchmakingReason,
} from "./actions";

// Agent capabilities (used by UI and Server Actions)
export {
    getAgentCapabilities,
    isToolAuthorised,
    AGENT_MIN_PLAN,
} from "./agent-capability";
export type { AgentToolName } from "./agent-capability";

// Agent Server Actions (used by AgentCopilot UI component)
export {
    executeAgentPrompt,
    getAgentSessionId,
    loadAgentConversation,
} from "./agent-actions";
export type { AgentResponse, AgentToolCallResult, AgentHistoryMessage } from "./agent-actions";

