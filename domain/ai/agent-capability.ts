/**
 * domain/ai/agent-capability.ts
 *
 * Determines which agent tools a user has access to based on their
 * organization role and subscription plan.
 *
 * This module is the server-side "capability scoping" layer that ensures
 * the AI agent can only invoke tools the user is authorised to use.
 */

import type { SubscriptionPlan } from "@prisma/client";

type OrgRole = "OWNER" | "ADMIN" | "MEMBER";

// ─── Tool Name Constants ──────────────────────────────────────────────────────

/** Read-only tools — available to all PRO+ users */
const READ_TOOLS = [
    "list_my_events",
    "get_event_details",
    "search_events",
    "get_recommendations",
    "get_my_profile",
    "get_org_details",
    "get_ai_usage_stats",
    "list_notifications",
] as const;

/** Write tools — available to MEMBER+ with PRO+ plan */
const WRITE_TOOLS = [
    "create_event",
    "update_event",
    "generate_event_description",
    "send_event_invites",
] as const;

/** Admin-only tools — requires ADMIN or OWNER role */
const ADMIN_TOOLS = [
    "delete_event",
] as const;

export type AgentToolName =
    | (typeof READ_TOOLS)[number]
    | (typeof WRITE_TOOLS)[number]
    | (typeof ADMIN_TOOLS)[number];

// ─── Capability Resolution ────────────────────────────────────────────────────

/**
 * Return the list of agent tool names a user is authorised to use.
 *
 * Rules:
 *   - FREE plan users cannot use the agent at all (returns empty array)
 *   - PRO+ users get all READ tools
 *   - PRO+ users get WRITE tools (all members can create/update)
 *   - ADMIN/OWNER users additionally get ADMIN tools
 */
export function getAgentCapabilities(
    role: OrgRole | string,
    plan: SubscriptionPlan,
): string[] {
    // FREE plan users have no agent access
    if (plan === "FREE") {
        return [];
    }

    const capabilities: string[] = [...READ_TOOLS];

    // All PRO+ members can write (create/update events)
    capabilities.push(...WRITE_TOOLS);

    // Only ADMIN/OWNER can use destructive tools
    if (role === "ADMIN" || role === "OWNER") {
        capabilities.push(...ADMIN_TOOLS);
    }

    return capabilities;
}

/**
 * Check if a specific tool is within the user's capabilities.
 */
export function isToolAuthorised(
    toolName: string,
    capabilities: string[],
): boolean {
    return capabilities.includes(toolName);
}

/**
 * Returns the minimum plan required to use the agent.
 */
export const AGENT_MIN_PLAN: SubscriptionPlan = "PRO";
