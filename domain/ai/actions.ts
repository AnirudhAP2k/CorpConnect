"use server";

/**
 * domain/ai/actions.ts
 *
 * Server Actions for tenant-facing AI features.
 * Every action enforces:
 *   1. Authentication (session check)
 *   2. Authorisation (org membership)
 *   3. Quota gate (plan + usage limit via domain/ai/quota)
 *   4. Usage deduction (after successful AI call)
 *
 * Migrated from actions/ai.actions.ts — that file now re-exports from here.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import {
    aiService,
    type AIChatResponse,
    type AIChatHistoryMessage,
    type AIGeneratedContent,
    type AIMatchmakingReason,
} from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "./quota";
import type { AiFeatureType } from "./types";

type ChatContextType = "EVENT" | "ORGANIZATION";

// ─── Quick-use AI features (recommendations, search) ──────────────────────────

interface AIFeatureInput {
    orgId: string;
    feature: "search" | "recommendEvents" | "recommendOrgs";
    query?: string;
}

export async function useAIFeature({ orgId, feature, query }: AIFeatureInput) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Membership check
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });
    if (!member) throw new Error("Forbidden");

    // Quota gate (replaces the old ApiCredential.usageCount check)
    const featureKey = feature as AiFeatureType;
    const quota = await checkAiQuota(orgId, featureKey);
    if (!quota.allowed) {
        return { success: false, error: quota.reason };
    }

    let result: unknown = null;

    try {
        if (feature === "search" && query) {
            result = await aiService.semanticSearch(query, 5);
        } else if (feature === "recommendEvents") {
            result = await aiService.recommendEvents(session.user.id, 5);
        } else if (feature === "recommendOrgs") {
            result = await aiService.recommendOrgs(orgId, 5);
        }

        if (result && (!Array.isArray(result) || result.length > 0)) {
            await deductAiUsage(orgId);
            return {
                success: true,
                data: result,
                remaining: (quota.remaining ?? 1) - 1,
            };
        }

        return { success: false, error: "AI Service returned no results." };
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to call AI Service";
        return { success: false, error: message };
    }
}

// ─── Admin AI stats (unchanged — platform-level, no quota) ────────────────────

export async function getAdminAIStats() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAppAdmin: true }
    });
    if (!user?.isAppAdmin) throw new Error("Forbidden");

    const totalCredentials = await prisma.apiCredential.count();

    const usageSum = await prisma.apiCredential.aggregate({
        _sum: { usageCount: true },
    });

    const activeInLast7Days = await prisma.apiCredential.count({
        where: {
            lastUsedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
        },
    });

    return {
        totalCredentials,
        totalCalls: usageSum._sum.usageCount || 0,
        activeInLast7Days,
    };
}

// ─── Chat (RAG-powered) ──────────────────────────────────────────────────────

/**
 * Verify the current user has access to read/chat about a given context.
 * - For EVENTs: the event must be public, OR the user must be a member of the hosting org.
 * - For ORGANIZATIONs: the user must be a member.
 * Returns the orgId for the context (used by the AI service for RAG lookups).
 */
async function verifyAccess(
    userId: string,
    contextId: string,
    contextType: ChatContextType,
): Promise<{ allowed: boolean; orgId?: string }> {
    if (contextType === "EVENT") {
        const event = await prisma.events.findUnique({
            where: { id: contextId },
            select: { organizationId: true, visibility: true },
        });
        if (!event) return { allowed: false };

        if (event.visibility === "PUBLIC") return { allowed: true, orgId: event.organizationId ?? undefined };

        const member = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: event.organizationId ?? "" } },
        });
        return { allowed: !!member, orgId: event.organizationId ?? undefined };
    }

    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: contextId } },
    });
    return { allowed: !!member, orgId: contextId };
}

export async function sendChatMessage(
    contextId: string,
    contextType: ChatContextType,
    message: string,
    sessionId: string = "new",
): Promise<{ success: true; data: AIChatResponse } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const { allowed, orgId } = await verifyAccess(session.user.id, contextId, contextType);
    if (!allowed) return { success: false, error: "You do not have access to chat about this content." };

    // Quota gate — chat requires PRO+
    if (orgId) {
        const quota = await checkAiQuota(orgId, "chat");
        if (!quota.allowed) return { success: false, error: quota.reason! };
    }

    const result = await aiService.chat({
        sessionId,
        userId: session.user.id,
        contextId,
        contextType,
        message,
    });

    if (!result) {
        return {
            success: false,
            error: "AI service is unavailable. Please ensure the AI service is running and LLM_API_KEY is set.",
        };
    }

    // Deduct after success
    if (orgId) await deductAiUsage(orgId);

    return { success: true, data: result };
}

export async function getChatHistory(
    sessionId: string,
): Promise<{ success: true; data: AIChatHistoryMessage[] } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // Verify the session belongs to this user
    const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { userId: true },
    });
    if (!chatSession || chatSession.userId !== session.user.id) {
        return { success: false, error: "Session not found or access denied." };
    }

    // Read-only — no quota deduction needed, but still requires PRO plan context
    const messages = await aiService.getChatHistory(sessionId);
    return { success: true, data: messages };
}

export async function getExistingSession(
    contextId: string,
    contextType: ChatContextType,
): Promise<string | null> {
    const session = await auth();
    if (!session?.user?.id) return null;

    const chatSession = await prisma.chatSession.findUnique({
        where: {
            userId_contextId_contextType: {
                userId: session.user.id,
                contextId,
                contextType,
            },
        },
        select: { id: true },
    });

    return chatSession?.id ?? null;
}

// ─── Content generation ───────────────────────────────────────────────────────

export async function generateEventDescription(
    orgId: string,
    roughDraft: string,
    eventId?: string,
): Promise<{ success: true; data: AIGeneratedContent } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });
    if (!member) return { success: false, error: "Forbidden" };

    // Quota gate
    const quota = await checkAiQuota(orgId, "generateDescription");
    if (!quota.allowed) return { success: false, error: quota.reason! };

    const result = await aiService.generateEventDescription(orgId, roughDraft, eventId);

    if (!result) {
        return {
            success: false,
            error: "AI service is unavailable or not configured. Please add LLM_API_KEY to the AI service.",
        };
    }

    await deductAiUsage(orgId);
    return { success: true, data: result };
}

export async function getMatchmakingReason(
    sourceOrgId: string,
    targetOrgId: string,
    score: number,
): Promise<{ success: true; data: AIMatchmakingReason } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: sourceOrgId } },
    });
    if (!member) return { success: false, error: "Forbidden" };

    // Quota gate
    const quota = await checkAiQuota(sourceOrgId, "matchmakingReason");
    if (!quota.allowed) return { success: false, error: quota.reason! };

    const result = await aiService.generateMatchmakingReason(sourceOrgId, targetOrgId, score);

    if (!result) {
        return {
            success: false,
            error: "Could not generate a matchmaking explanation at this time.",
        };
    }

    await deductAiUsage(sourceOrgId);
    return { success: true, data: result };
}
