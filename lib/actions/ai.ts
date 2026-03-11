"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";

interface AIFeature {
    orgId: string;
    feature: "search" | "recommendEvents" | "recommendOrgs";
    query?: string;
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
