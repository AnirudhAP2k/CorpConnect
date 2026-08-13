"use client";

import { CheckCircle2, XCircle, ShieldAlert, Wrench, Loader2 } from "lucide-react";
import type { AgentToolCallResult } from "@/domain/ai";

interface AgentToolStatusProps {
    toolCalls: AgentToolCallResult[];
}

const FRIENDLY_NAMES: Record<string, string> = {
    list_my_events: "Fetching events",
    get_event_details: "Retrieving event details",
    search_events: "Searching events",
    get_recommendations: "Fetching AI recommendations",
    get_my_profile: "Loading profile",
    get_org_details: "Loading organization info",
    get_ai_usage_stats: "Checking AI quota",
    create_event: "Creating event",
    update_event: "Updating event",
    delete_event: "Deleting event",
    generate_event_description: "Generating AI description",
    list_notifications: "Fetching notifications",
    send_event_invites: "Sending invitations",
    discover_organizations: "Finding matching organizations",
    list_org_connections: "Loading org connections",
    list_attending_events: "Fetching attending events",
    get_meeting_requests: "Loading meeting requests",
    get_org_dashboard_stats: "Loading dashboard stats",
    list_org_members: "Listing org members",
    list_pending_invites: "Checking invitations",
    get_billing_status: "Checking billing status",
};

export function AgentToolStatus({ toolCalls }: AgentToolStatusProps) {
    if (!toolCalls || toolCalls.length === 0) return null;

    return (
        <div className="my-2 space-y-2">
            {toolCalls.map((call, idx) => {
                const friendlyName = FRIENDLY_NAMES[call.toolName] || call.toolName;
                const isExecuting = call.status === "executing";
                const isSuccess = call.status === "success";
                const isDenied = call.status === "denied";

                return (
                    <div
                        key={idx}
                        className={`flex items-start gap-2 rounded-xl p-2.5 text-xs border transition-all ${
                            isExecuting
                                ? "bg-violet-50/70 border-violet-200 text-violet-800"
                                : isSuccess
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                                : isDenied
                                ? "bg-amber-50/70 border-amber-200 text-amber-800"
                                : "bg-red-50/70 border-red-200 text-red-800"
                        }`}
                    >
                        <div className="mt-0.5 shrink-0">
                            {isExecuting ? (
                                <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                            ) : isSuccess ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : isDenied ? (
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                            ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 font-medium">
                                <Wrench className="h-3 w-3 opacity-70" />
                                <span>{friendlyName} {isExecuting ? "..." : ""}</span>
                            </div>

                            {call.error && (
                                <p className="mt-1 text-[11px] opacity-90 leading-tight">
                                    {call.error}
                                </p>
                            )}

                            {isSuccess && typeof call.result === "object" && call.result !== null && (
                                <div className="mt-1 text-[11px] opacity-90 truncate">
                                    {"message" in (call.result as Record<string, unknown>)
                                        ? String((call.result as Record<string, unknown>).message)
                                        : Array.isArray(call.result)
                                        ? `${(call.result as unknown[]).length} item(s) found`
                                        : "Operation completed"}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
