"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutomationTriggerType =
    | "EVENT_REGISTRATION"
    | "EVENT_CANCELLED"
    | "FEEDBACK_RECEIVED"
    | "CONNECTION_ACCEPTED"
    | "MEETING_SCHEDULED"
    | "NEW_MEMBER_JOINED";

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
    EVENT_REGISTRATION: "New Event Registration",
    EVENT_CANCELLED: "Event Cancelled",
    FEEDBACK_RECEIVED: "Feedback Submitted",
    CONNECTION_ACCEPTED: "Connection Accepted",
    MEETING_SCHEDULED: "Meeting Request Accepted",
    NEW_MEMBER_JOINED: "New Member Joined",
};

export interface AutomationRuleData {
    id: string;
    name: string;
    description: string | null;
    trigger: AutomationTriggerType;
    webhookUrl: string;
    status: "ACTIVE" | "PAUSED" | "DELETED";
    runCount: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    createdAt: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateRuleSchema = z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(300).optional(),
    trigger: z.enum([
        "EVENT_REGISTRATION", "EVENT_CANCELLED", "FEEDBACK_RECEIVED",
        "CONNECTION_ACCEPTED", "MEETING_SCHEDULED", "NEW_MEMBER_JOINED",
    ]),
    webhookUrl: z.string().url().startsWith("https://", { message: "Webhook URL must start with https://" }),
    filterJson: z.record(z.unknown()).optional(),
});

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function verifyOrgAdmin(orgId: string, userId: string) {
    const m = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });
    return m?.role === "OWNER" || m?.role === "ADMIN";
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createAutomationRule(
    orgId: string,
    input: z.infer<typeof CreateRuleSchema>,
): Promise<{ success: true; data: AutomationRuleData } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!(await verifyOrgAdmin(orgId, session.user.id))) {
        return { success: false, error: "Only org owners or admins can create automation rules." };
    }

    const parsed = CreateRuleSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors.map(e => e.message).join(". ") };
    }

    const rule = await prisma.automationRule.create({
        data: {
            organizationId: orgId,
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            trigger: parsed.data.trigger,
            webhookUrl: parsed.data.webhookUrl,
            filterJson: parsed.data.filterJson ?? null,
        },
    });

    return {
        success: true,
        data: {
            ...rule,
            trigger: rule.trigger as AutomationTriggerType,
            status: rule.status as "ACTIVE" | "PAUSED" | "DELETED",
            lastRunAt: rule.lastRunAt?.toISOString() ?? null,
            createdAt: rule.createdAt.toISOString(),
        },
    };
}

export async function listAutomationRules(
    orgId: string,
): Promise<{ success: true; data: AutomationRuleData[] } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!(await verifyOrgAdmin(orgId, session.user.id))) {
        return { success: false, error: "Access denied." };
    }

    const rules = await prisma.automationRule.findMany({
        where: { organizationId: orgId, status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
    });

    return {
        success: true,
        data: rules.map(r => ({
            ...r,
            trigger: r.trigger as AutomationTriggerType,
            status: r.status as "ACTIVE" | "PAUSED" | "DELETED",
            lastRunAt: r.lastRunAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
        })),
    };
}

export async function toggleAutomationRule(
    ruleId: string,
): Promise<{ success: true; status: "ACTIVE" | "PAUSED" } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { status: true, organizationId: true },
    });
    if (!rule) return { success: false, error: "Rule not found." };
    if (!(await verifyOrgAdmin(rule.organizationId, session.user.id))) {
        return { success: false, error: "Access denied." };
    }

    const newStatus = rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await prisma.automationRule.update({
        where: { id: ruleId },
        data: { status: newStatus },
    });

    return { success: true, status: newStatus as "ACTIVE" | "PAUSED" };
}

export async function deleteAutomationRule(
    ruleId: string,
): Promise<{ success: true } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { organizationId: true },
    });
    if (!rule) return { success: false, error: "Rule not found." };
    if (!(await verifyOrgAdmin(rule.organizationId, session.user.id))) {
        return { success: false, error: "Access denied." };
    }

    // Soft delete — preserves run history
    await prisma.automationRule.update({
        where: { id: ruleId },
        data: { status: "DELETED" },
    });

    return { success: true };
}

export async function testAutomationRule(
    ruleId: string,
): Promise<{ success: true; jobId: string } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { organizationId: true, trigger: true },
    });
    if (!rule) return { success: false, error: "Rule not found." };
    if (!(await verifyOrgAdmin(rule.organizationId, session.user.id))) {
        return { success: false, error: "Access denied." };
    }

    const job = await prisma.jobQueue.create({
        data: {
            type: "TRIGGER_N8N_WORKFLOW",
            payload: {
                ruleId,
                trigger: rule.trigger,
                orgId: rule.organizationId,
                contextData: { test: true, triggeredBy: session.user.id },
            },
        },
    });

    return { success: true, jobId: job.id };
}
