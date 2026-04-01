"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { aiService, AIChatResponse, AIChatHistoryMessage, AIGeneratedContent, AIMatchmakingReason } from "@/lib/ai-service";

type ChatContextType = "EVENT" | "ORGANIZATION";

interface AIFeature {
    orgId: string;
    feature: "search" | "recommendEvents" | "recommendOrgs";
    query?: string;
}

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
        _sum: {
            usageCount: true
        }
    });

    const activeInLast7Days = await prisma.apiCredential.count({
        where: {
            lastUsedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
        }
    });

    return {
        totalCredentials,
        totalCalls: usageSum._sum.usageCount || 0,
        activeInLast7Days
    };
}

export async function useAIFeature({ orgId, feature, query }: AIFeature) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Verify user is member
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
    });
    if (!member) throw new Error("Forbidden");

    const credential = await prisma.apiCredential.findUnique({
        where: { organizationId: orgId },
    });

    if (!credential) {
        throw new Error("No API credentials found. Please generate an API Key first.");
    }

    if (credential.usageCount >= credential.usageLimit) {
        throw new Error("API usage limit reached. Please upgrade your tier.");
    }

    let result: any = null;

    try {
        if (feature === "search" && query) {
            result = await aiService.semanticSearch(query, 5);
        } else if (feature === "recommendEvents") {
            result = await aiService.recommendEvents(session.user.id, 5);
        } else if (feature === "recommendOrgs") {
            result = await aiService.recommendOrgs(orgId, 5);
        }

        if (result && (!Array.isArray(result) || result.length >= 0)) {
            await prisma.apiCredential.update({
                where: { id: credential.id },
                data: {
                    usageCount: { increment: 1 },
                    lastUsedAt: new Date()
                }
            });
            return { success: true, data: result };
        } else {
            return { success: false, error: "AI Service returned no results." };
        }
    } catch (e: any) {
        return { success: false, error: e.message || "Failed to call AI Service" };
    }
}

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


        // Private/InviteOnly — must be an org member
        const member = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: event.organizationId ?? "" } },
        });
        return { allowed: !!member, orgId: event.organizationId ?? undefined };

    }

    // ORGANIZATION context
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

    const { allowed } = await verifyAccess(session.user.id, contextId, contextType);
    if (!allowed) return { success: false, error: "You do not have access to chat about this content." };

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

    const result = await aiService.generateEventDescription(orgId, roughDraft, eventId);

    if (!result) {
        return {
            success: false,
            error: "AI service is unavailable or not configured. Please add LLM_API_KEY to the AI service.",
        };
    }

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

    const result = await aiService.generateMatchmakingReason(sourceOrgId, targetOrgId, score);

    if (!result) {
        return {
            success: false,
            error: "Could not generate a matchmaking explanation at this time.",
        };
    }

    return { success: true, data: result };
}
