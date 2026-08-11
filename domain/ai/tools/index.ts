import type { ToolHandler, ToolContext } from "./types";
import {
    listMyEventsHandler,
    getEventDetailsHandler,
    createEventHandler,
    updateEventHandler,
    deleteEventHandler,
} from "./events.tools";
import {
    searchEventsHandler,
    getRecommendationsHandler,
    getAiUsageStatsHandler,
    generateEventDescriptionHandler,
} from "./ai.tools";
import {
    getMyProfileHandler,
    getOrgDetailsHandler,
    listNotificationsHandler,
    sendEventInvitesHandler,
} from "./user.tools";

/**
 * Command Pattern / Tool Handler Registry Map inside Domain Layer.
 *
 * Domain-Driven Design (DDD) Compliant:
 *   - Business logic resides strictly inside /domain
 *   - The API route handler simply delegates to executeAgentTool()
 */
export const TOOL_REGISTRY: Record<string, ToolHandler> = {
    list_my_events: listMyEventsHandler,
    get_event_details: getEventDetailsHandler,
    create_event: createEventHandler,
    update_event: updateEventHandler,
    delete_event: deleteEventHandler,

    search_events: searchEventsHandler,
    get_recommendations: getRecommendationsHandler,
    get_ai_usage_stats: getAiUsageStatsHandler,
    generate_event_description: generateEventDescriptionHandler,

    get_my_profile: getMyProfileHandler,
    get_org_details: getOrgDetailsHandler,
    list_notifications: listNotificationsHandler,
    send_event_invites: sendEventInvitesHandler,
};

export async function executeAgentTool(toolName: string, ctx: ToolContext): Promise<unknown> {
    const handler = TOOL_REGISTRY[toolName];
    if (!handler) {
        throw new Error(`Unsupported tool: ${toolName}`);
    }
    return handler(ctx);
}

export type { ToolContext, ToolHandler } from "./types";
