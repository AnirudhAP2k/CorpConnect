"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiService, AIChatResponse, AIChatHistoryMessage } from "@/lib/ai-service";

type ChatContextType = "EVENT" | "ORGANIZATION";

// ─── Access Verification ──────────────────────────────────────────────────────

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

// ─── Send a chat message ──────────────────────────────────────────────────────

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

// ─── Load chat history ────────────────────────────────────────────────────────

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

// ─── Resolve existing session ─────────────────────────────────────────────────

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
