"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiService, AIGeneratedContent, AIMatchmakingReason } from "@/lib/ai-service";

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
