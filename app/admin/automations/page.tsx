import { Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { AdminAutomationsClient } from "@/components/admin/AdminAutomationsClient";

export default async function AdminAutomationsPage() {
    const templates = await prisma.automationWorkflowTemplate.findMany({
        orderBy: [{ trigger: "asc" }, { name: "asc" }],
    });

    const initial = templates.map(t => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        description: t.description,
        trigger: t.trigger,
        webhookUrl: t.webhookUrl,
        defaultPromptTemplate: t.defaultPromptTemplate,
        isActive: t.isActive,
    }));

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Zap className="h-6 w-6 text-primary" />
                    Automation Templates
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Platform catalog of n8n workflows. Org admins pick these from a dropdown — set real
                    production webhook URLs here after activating workflows in n8n.
                </p>
            </div>

            <AdminAutomationsClient initial={initial} />
        </div>
    );
}
