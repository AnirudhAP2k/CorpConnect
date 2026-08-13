"use server";

/**
 * domain/ai/agent-actions.ts
 *
 * Server Action for the in-app AI Agent copilot.
 *
 * Enforces:
 *   1. Authentication (session check)
 *   2. Authorization (org membership + role)
 *   3. Capability scoping (determines which tools the user can call)
 *   4. Quota gate (PRO+ plan required, usage metering)
 *   5. Delegates to the Python ai-service agent loop
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "./quota";
import { getAgentCapabilities } from "./agent-capability";
import type { SubscriptionPlan } from "@prisma/client";

// ─── Response Types ──────────────────────────────────────────────────────────

export interface AgentToolCallResult {
    toolName: string;
    status: "success" | "error" | "denied" | "executing" | string;
    result?: unknown;
    error?: string;
}

export interface AgentResponse {
    sessionId: string;
    reply: string;
    toolCalls: AgentToolCallResult[];
}

// ─── Main Server Action ──────────────────────────────────────────────────────

/**
 * Execute a prompt through the AI Agent.
 * This is the single entry point called by the AgentCopilot frontend component.
 */
export async function executeAgentPrompt(
    message: string,
    sessionId: string = "new",
): Promise<
    | { success: true; data: AgentResponse }
    | { success: false; error: string }
> {
    // ── 1. Auth check ────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "You must be logged in to use the AI Agent." };
    }

    const userId = session.user.id;
    const orgId = session.user.activeOrganizationId;

    if (!orgId) {
        return {
            success: false,
            error: "You need an active organization to use the AI Agent. Please select one first.",
        };
    }

    // ── 2. Fetch user's org membership + plan ────────────────────────────
    const [member, org] = await Promise.all([
        prisma.organizationMember.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId: orgId,
                },
            },
            select: { role: true },
        }),
        prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                name: true,
                subscriptionPlan: true,
            },
        }),
    ]);

    if (!member) {
        return { success: false, error: "You are not a member of the active organization." };
    }

    if (!org) {
        return { success: false, error: "Organization not found." };
    }

    // ── 3. Determine capabilities ────────────────────────────────────────
    const capabilities = getAgentCapabilities(
        member.role as string,
        org.subscriptionPlan as SubscriptionPlan,
    );

    if (capabilities.length === 0) {
        return {
            success: false,
            error: "The AI Agent requires a PRO or ENTERPRISE plan. Upgrade your subscription to get started.",
        };
    }

    // ── 4. Quota check ───────────────────────────────────────────────────
    const quota = await checkAiQuota(orgId, "agent");
    if (!quota.allowed) {
        return { success: false, error: quota.reason! };
    }

    // ── 5. Call the ai-service agent loop ────────────────────────────────
    try {
        const result = await aiService.executeAgentPrompt({
            message,
            userId,
            orgId,
            sessionId,
            capabilities,
            userName: session.user.name || "User",
            orgName: org.name,
            orgPlan: org.subscriptionPlan,
            userRole: member.role,
        });

        if (!result) {
            return {
                success: false,
                error: "The AI Agent is currently unavailable. Please ensure the AI service is running.",
            };
        }

        // ── 6. Deduct quota after success ────────────────────────────────
        await deductAiUsage(orgId);

        return {
            success: true,
            data: {
                sessionId: result.sessionId,
                reply: result.reply,
                toolCalls: (result.toolCalls || []).map(tc => ({
                    toolName: tc.toolName,
                    status: (["success", "error", "denied"].includes(tc.status)
                        ? tc.status
                        : "error") as "success" | "error" | "denied",
                    result: tc.result,
                    error: tc.error,
                })),
            },
        };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "An unexpected error occurred.";
        return { success: false, error: message };
    }
}

export interface AgentHistoryMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
}

/**
 * Get the existing agent session ID for the current user (if any).
 * Used by the frontend to resume conversations.
 */
export async function getAgentSessionId(): Promise<string | null> {
    const session = await auth();
    if (!session?.user?.id || !session.user.activeOrganizationId) return null;

    const chatSession = await prisma.chatSession.findUnique({
        where: {
            userId_contextId_contextType: {
                userId: session.user.id,
                contextId: session.user.activeOrganizationId,
                contextType: "AGENT",
            },
        },
        select: { id: true },
    });

    return chatSession?.id ?? null;
}

/**
 * Load the current user's AGENT conversation for their active org.
 * Reads ChatMessage directly from Prisma (does not depend on the AI service).
 */
export async function loadAgentConversation(): Promise<
    | { success: true; sessionId: string | null; messages: AgentHistoryMessage[] }
    | { success: false; error: string }
> {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Unauthorized" };
    }

    const orgId = session.user.activeOrganizationId;
    if (!orgId) {
        return { success: true, sessionId: null, messages: [] };
    }

    const chatSession = await prisma.chatSession.findUnique({
        where: {
            userId_contextId_contextType: {
                userId: session.user.id,
                contextId: orgId,
                contextType: "AGENT",
            },
        },
        select: {
            id: true,
            messages: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            },
        },
    });

    if (!chatSession) {
        return { success: true, sessionId: null, messages: [] };
    }

    return {
        success: true,
        sessionId: chatSession.id,
        messages: chatSession.messages.map((m) => ({
            id: m.id,
            role: m.role === "ASSISTANT" ? "assistant" : "user",
            content: m.content,
            createdAt: m.createdAt.toISOString(),
        })),
    };
}
