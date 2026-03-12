"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

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
