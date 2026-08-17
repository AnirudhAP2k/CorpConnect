"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { CreateRuleSchema } from "@/lib/validation";
import { AutomationTriggerType } from "@/lib/types";

export interface AutomationRuleData {
    id: string;
    name: string;
    description: string | null;
    trigger: AutomationTriggerType;
    webhookUrl: string | null;
    templateId: string | null;
    templateName: string | null;
    promptTemplate: string | null;
    status: "ACTIVE" | "PAUSED" | "DELETED";
    runCount: number;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    createdAt: string;
}

export interface AutomationTemplateOption {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    trigger: AutomationTriggerType;
    defaultPromptTemplate: string | null;
}

// ─── Auth guard helper ────────────────────────────────────────────────────────

async function verifyOrgAdmin(orgId: string, userId: string) {
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });
    return member?.role === "OWNER" || member?.role === "ADMIN";
}

const mapRule = (rule: {
    id: string;
    name: string;
    description: string | null;
    trigger: string;
    webhookUrl: string | null;
    templateId: string | null;
    promptTemplate: string | null;
    status: string;
    runCount: number;
    lastRunAt: Date | null;
    lastRunStatus: string | null;
    createdAt: Date;
    template?: { name: string } | null;
}): AutomationRuleData => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    trigger: rule.trigger as AutomationTriggerType,
    webhookUrl: rule.webhookUrl,
    templateId: rule.templateId,
    templateName: rule.template?.name ?? null,
    promptTemplate: rule.promptTemplate ?? null,
    status: rule.status as "ACTIVE" | "PAUSED" | "DELETED",
    runCount: rule.runCount,
    lastRunAt: rule.lastRunAt?.toISOString() ?? null,
    lastRunStatus: rule.lastRunStatus,
    createdAt: rule.createdAt.toISOString(),
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function listAutomationTemplates(
    trigger?: AutomationTriggerType,
): Promise<{ success: true; data: AutomationTemplateOption[] } | { success: false; error: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const templates = await prisma.automationWorkflowTemplate.findMany({
        where: {
            isActive: true,
            ...(trigger ? { trigger } : {}),
        },
        orderBy: { name: "asc" },
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            trigger: true,
            defaultPromptTemplate: true,
        },
    });

    return {
        success: true,
        data: templates.map(t => ({
            ...t,
            trigger: t.trigger as AutomationTriggerType,
        })),
    };
}

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

    const templateId: string | null = parsed.data.templateId ?? null;
    let webhookUrl: string | null = parsed.data.webhookUrl ?? null;
    let promptTemplate: string | null = parsed.data.promptTemplate ?? null;

    if (templateId) {
        const template = await prisma.automationWorkflowTemplate.findFirst({
            where: { id: templateId, isActive: true },
            select: {
                id: true,
                trigger: true,
                defaultPromptTemplate: true,
            },
        });
        if (!template) {
            return { success: false, error: "Selected workflow template was not found or is inactive." };
        }
        if (template.trigger !== parsed.data.trigger) {
            return {
                success: false,
                error: `Template trigger (${template.trigger}) does not match the selected trigger (${parsed.data.trigger}).`,
            };
        }
        // Template-backed rules resolve URL at fire time; keep webhookUrl null
        webhookUrl = null;
        if (!promptTemplate && template.defaultPromptTemplate) {
            promptTemplate = template.defaultPromptTemplate;
        }
    }

    const rule = await prisma.automationRule.create({
        data: {
            organizationId: orgId,
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            trigger: parsed.data.trigger,
            webhookUrl,
            templateId,
            filterJson: (parsed.data.filterJson as Prisma.InputJsonValue) ?? undefined,
            promptTemplate,
        },
        include: { template: { select: { name: true } } },
    });

    return {
        success: true,
        data: mapRule(rule),
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
        include: { template: { select: { name: true, webhookUrl: true } } },
    });

    return {
        success: true,
        data: rules.map(r => mapRule({
            ...r,
            // Display host: prefer template URL when catalog-backed
            webhookUrl: r.template?.webhookUrl ?? r.webhookUrl,
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
        select: {
            organizationId: true,
            trigger: true,
            promptTemplate: true,
            template: { select: { defaultPromptTemplate: true } },
        },
    });
    if (!rule) return { success: false, error: "Rule not found." };
    if (!(await verifyOrgAdmin(rule.organizationId, session.user.id))) {
        return { success: false, error: "Access denied." };
    }

    const resolvedPrompt =
        rule.promptTemplate ?? rule.template?.defaultPromptTemplate ?? null;

    const job = await prisma.jobQueue.create({
        data: {
            type: "TRIGGER_N8N_WORKFLOW",
            payload: {
                ruleId,
                trigger: rule.trigger,
                orgId: rule.organizationId,
                contextData: { test: true, triggeredBy: session.user.id },
                ...(resolvedPrompt ? { promptTemplate: resolvedPrompt } : {}),
            } as Prisma.InputJsonValue,
        },
    });

    return { success: true, jobId: job.id };
}
