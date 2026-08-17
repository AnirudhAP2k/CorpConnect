"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Zap, ChevronDown, ChevronRight } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    createAutomationRule,
    listAutomationTemplates,
} from "@/actions/automation.actions";
import type { AutomationRuleData, AutomationTemplateOption } from "@/actions/automation.actions";
import { TRIGGER_LABELS } from "@/constants";
import { AutomationTriggerType } from "@/lib/types";
import { toast } from "sonner";

interface AddRuleSheetProps {
    orgId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRuleCreated: (rule: AutomationRuleData) => void;
}

const ALL_TRIGGERS = Object.entries(TRIGGER_LABELS) as [AutomationTriggerType, string][];

export function AddRuleSheet({ orgId, open, onOpenChange, onRuleCreated }: AddRuleSheetProps) {
    const [name, setName] = useState("");
    const [description, setDesc] = useState("");
    const [trigger, setTrigger] = useState<AutomationTriggerType | "">("");
    const [templateId, setTemplateId] = useState("");
    const [webhookUrl, setWebhook] = useState("");
    const [useCustomWebhook, setUseCustomWebhook] = useState(false);
    const [promptTemplate, setPrompt] = useState("");
    const [templates, setTemplates] = useState<AutomationTemplateOption[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reset = () => {
        setName("");
        setDesc("");
        setTrigger("");
        setTemplateId("");
        setWebhook("");
        setUseCustomWebhook(false);
        setPrompt("");
        setError(null);
    };

    useEffect(() => {
        if (!open) return;
        setTemplatesLoading(true);
        listAutomationTemplates()
            .then(res => {
                if (res.success) setTemplates(res.data);
            })
            .finally(() => setTemplatesLoading(false));
    }, [open]);

    const templatesForTrigger = trigger
        ? templates.filter(t => t.trigger === trigger)
        : templates;

    const selectedTemplate = templates.find(t => t.id === templateId);

    const handleTriggerChange = (v: AutomationTriggerType) => {
        setTrigger(v);
        // Clear template if it no longer matches the trigger
        if (templateId) {
            const stillValid = templates.some(t => t.id === templateId && t.trigger === v);
            if (!stillValid) {
                setTemplateId("");
                setPrompt("");
            }
        }
    };

    const handleTemplateChange = (id: string) => {
        setTemplateId(id);
        setUseCustomWebhook(false);
        setWebhook("");
        const t = templates.find(x => x.id === id);
        if (t?.defaultPromptTemplate && !promptTemplate) {
            setPrompt(t.defaultPromptTemplate);
        }
        if (t && !trigger) {
            setTrigger(t.trigger);
        }
    };

    const handleSubmit = () => {
        if (!trigger) { setError("Please select a trigger event."); return; }
        if (!useCustomWebhook && !templateId) {
            setError("Please select a workflow template.");
            return;
        }
        if (useCustomWebhook && !webhookUrl) {
            setError("Please enter a custom webhook URL.");
            return;
        }
        setError(null);

        startTransition(async () => {
            const res = await createAutomationRule(orgId, {
                name,
                description: description || undefined,
                trigger: trigger as AutomationTriggerType,
                ...(useCustomWebhook
                    ? { webhookUrl }
                    : { templateId }),
                promptTemplate: promptTemplate || undefined,
            });

            if (res.success) {
                onRuleCreated(res.data);
                reset();
                onOpenChange(false);
                toast.success("Rule created successfully!");
            } else {
                setError(res.error);
                toast.error(res.error || "Failed to create rule");
            }
        });
    };

    const canSubmit =
        !!name
        && !!trigger
        && (useCustomWebhook ? !!webhookUrl : !!templateId);

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        New Automation Rule
                    </SheetTitle>
                    <SheetDescription>
                        Pick a platform workflow template. CorpConnect will POST a signed payload to the template&apos;s n8n webhook when the trigger fires.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-5">
                    <div className="space-y-1.5">
                        <Label htmlFor="rule-name">Rule name *</Label>
                        <Input
                            id="rule-name"
                            placeholder="e.g. Notify Slack on registration"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            maxLength={80}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="rule-trigger">Trigger event *</Label>
                        <Select
                            value={trigger}
                            onValueChange={v => handleTriggerChange(v as AutomationTriggerType)}
                        >
                            <SelectTrigger id="rule-trigger">
                                <SelectValue placeholder="Select a trigger…" />
                            </SelectTrigger>
                            <SelectContent>
                                {ALL_TRIGGERS.map(([val, label]) => (
                                    <SelectItem key={val} value={val}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!useCustomWebhook && (
                        <div className="space-y-1.5">
                            <Label htmlFor="rule-template">Workflow template *</Label>
                            <Select
                                value={templateId}
                                onValueChange={handleTemplateChange}
                                disabled={templatesLoading || (!!trigger && templatesForTrigger.length === 0)}
                            >
                                <SelectTrigger id="rule-template">
                                    <SelectValue
                                        placeholder={
                                            templatesLoading
                                                ? "Loading templates…"
                                                : trigger && templatesForTrigger.length === 0
                                                    ? "No templates for this trigger"
                                                    : "Select a workflow…"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {templatesForTrigger.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTemplate?.description && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedTemplate.description}
                                </p>
                            )}
                            {trigger && !templatesLoading && templatesForTrigger.length === 0 && (
                                <p className="text-xs text-amber-600">
                                    No active templates for this trigger. Ask an app admin to seed or activate one, or use a custom webhook.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            setUseCustomWebhook(v => !v);
                            if (!useCustomWebhook) setTemplateId("");
                            else setWebhook("");
                        }}
                    >
                        {useCustomWebhook ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        Advanced: custom webhook URL (BYO n8n)
                    </button>

                    {useCustomWebhook && (
                        <div className="space-y-1.5">
                            <Label htmlFor="rule-webhook">n8n Webhook URL *</Label>
                            <Input
                                id="rule-webhook"
                                type="url"
                                placeholder="https://your-n8n.domain.com/webhook/..."
                                value={webhookUrl}
                                onChange={e => setWebhook(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Must be a public <code>https://</code> URL. Prefer platform templates when available.
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="rule-desc">
                            Description <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Textarea
                            id="rule-desc"
                            placeholder="What does this automation do?"
                            value={description}
                            onChange={e => setDesc(e.target.value)}
                            maxLength={300}
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="rule-prompt">
                            Agent instruction <span className="text-muted-foreground text-xs">(optional override)</span>
                        </Label>
                        <Textarea
                            id="rule-prompt"
                            placeholder='e.g. "If dietary restrictions are present, email the caterer and thank the attendee."'
                            value={promptTemplate}
                            onChange={e => setPrompt(e.target.value)}
                            maxLength={2000}
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Overrides the template default instruction sent to the n8n AI Agent node.
                        </p>
                    </div>

                    {trigger && (
                        <div className="rounded-lg bg-muted p-3 text-xs font-mono text-muted-foreground space-y-0.5">
                            <p className="text-xs font-sans font-medium text-foreground mb-1">Payload preview</p>
                            <p>{`{`}</p>
                            <p className="pl-4">{`"trigger": "${trigger}",`}</p>
                            <p className="pl-4">{`"orgId":   "<your-org-id>",`}</p>
                            <p className="pl-4">{`"contextData": { ... },`}</p>
                            {promptTemplate && (
                                <p className="pl-4">{`"promptTemplate": "${promptTemplate.length > 60 ? promptTemplate.slice(0, 60) + "…" : promptTemplate}",`}</p>
                            )}
                            <p className="pl-4">{`"timestamp": 1234567890`}</p>
                            <p>{`}`}</p>
                        </div>
                    )}

                    {error && (
                        <p id="add-rule-error" role="alert" className="text-sm text-destructive font-medium">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => { reset(); onOpenChange(false); }}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            id="add-rule-submit"
                            className="flex-1 gap-2"
                            onClick={handleSubmit}
                            disabled={isPending || !canSubmit}
                        >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isPending ? "Creating…" : "Create Rule"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
