"use client";

import { useState, useTransition } from "react";
import { updateAutomationWorkflowTemplateAction } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export type AdminTemplateRow = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    trigger: string;
    webhookUrl: string;
    defaultPromptTemplate: string | null;
    isActive: boolean;
};

export function AdminAutomationsClient({ initial }: { initial: AdminTemplateRow[] }) {
    const [rows, setRows] = useState(initial);
    const [drafts, setDrafts] = useState<Record<string, string>>(
        Object.fromEntries(initial.map(t => [t.id, t.webhookUrl])),
    );
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const save = (id: string) => {
        const webhookUrl = drafts[id]?.trim();
        if (!webhookUrl) {
            setMessage("Webhook URL cannot be empty.");
            return;
        }
        startTransition(async () => {
            const res = await updateAutomationWorkflowTemplateAction({ id, webhookUrl });
            if (res.success) {
                setRows(prev => prev.map(r => (r.id === id ? { ...r, webhookUrl: res.data.webhookUrl } : r)));
                setMessage(`Saved webhook for ${res.data.slug}.`);
            } else {
                setMessage(res.error);
            }
        });
    };

    const toggleActive = (id: string, isActive: boolean) => {
        startTransition(async () => {
            const res = await updateAutomationWorkflowTemplateAction({ id, isActive });
            if (res.success) {
                setRows(prev => prev.map(r => (r.id === id ? { ...r, isActive: res.data.isActive } : r)));
                setMessage(`${res.data.slug} ${res.data.isActive ? "activated" : "deactivated"}.`);
            } else {
                setMessage(res.error);
            }
        });
    };

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No templates yet. Run <code className="text-xs bg-muted px-1 rounded">pnpm db:seed</code> after
                migrating to insert the default catalog, then set real n8n production webhook URLs here.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {message && (
                <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">{message}</p>
            )}
            {rows.map(t => (
                <div key={t.id} className="rounded-xl border bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{t.name}</p>
                                <Badge variant="secondary" className="text-xs">{t.trigger}</Badge>
                                <Badge
                                    variant={t.isActive ? "default" : "outline"}
                                    className="text-xs"
                                >
                                    {t.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">slug: {t.slug}</p>
                            {t.description && (
                                <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => toggleActive(t.id, !t.isActive)}
                        >
                            {t.isActive ? "Deactivate" : "Activate"}
                        </Button>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor={`wh-${t.id}`}>
                                n8n production webhook URL
                            </label>
                            <Input
                                id={`wh-${t.id}`}
                                value={drafts[t.id] ?? ""}
                                onChange={e => setDrafts(prev => ({ ...prev, [t.id]: e.target.value }))}
                                placeholder="https://n8n.example.com/webhook/..."
                            />
                        </div>
                        <Button
                            size="sm"
                            disabled={isPending || drafts[t.id] === t.webhookUrl}
                            onClick={() => save(t.id)}
                        >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            Save
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
