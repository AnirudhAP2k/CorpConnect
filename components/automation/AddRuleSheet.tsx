"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap } from "lucide-react";
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
import { createAutomationRule, TRIGGER_LABELS } from "@/lib/actions/automation";
import type { AutomationRuleData, AutomationTriggerType } from "@/lib/actions/automation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddRuleSheetProps {
    orgId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRuleCreated: (rule: AutomationRuleData) => void;
}

const ALL_TRIGGERS = Object.entries(TRIGGER_LABELS) as [AutomationTriggerType, string][];

// ─── Component ────────────────────────────────────────────────────────────────

export function AddRuleSheet({ orgId, open, onOpenChange, onRuleCreated }: AddRuleSheetProps) {
    const [name, setName] = useState("");
    const [description, setDesc] = useState("");
    const [trigger, setTrigger] = useState<AutomationTriggerType | "">("");
    const [webhookUrl, setWebhook] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const reset = () => {
        setName(""); setDesc(""); setTrigger(""); setWebhook(""); setError(null);
    };

    const handleSubmit = () => {
        if (!trigger) { setError("Please select a trigger event."); return; }
        setError(null);

        startTransition(async () => {
            const res = await createAutomationRule(orgId, {
                name,
                description: description || undefined,
                trigger: trigger as AutomationTriggerType,
                webhookUrl,
            });

            if (res.success) {
                onRuleCreated(res.data);
                reset();
                onOpenChange(false);
            } else {
                setError(res.error);
            }
        });
    };

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        New Automation Rule
                    </SheetTitle>
                    <SheetDescription>
                        When the selected event fires, Evently will POST a signed payload to your n8n webhook URL.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-5">
                    {/* Rule name */}
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

                    {/* Trigger selector */}
                    <div className="space-y-1.5">
                        <Label htmlFor="rule-trigger">Trigger event *</Label>
                        <Select
                            value={trigger}
                            onValueChange={v => setTrigger(v as AutomationTriggerType)}
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
                        {trigger && (
                            <p className="text-xs text-muted-foreground">
                                Fires when: <strong>{TRIGGER_LABELS[trigger as AutomationTriggerType]}</strong>
                            </p>
                        )}
                    </div>

                    {/* Webhook URL */}
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
                            Must be a public <code>https://</code> URL pointing to your n8n webhook trigger node.
                        </p>
                    </div>

                    {/* Optional description */}
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

                    {/* N8n payload preview */}
                    {trigger && (
                        <div className="rounded-lg bg-muted p-3 text-xs font-mono text-muted-foreground space-y-0.5">
                            <p className="text-xs font-sans font-medium text-foreground mb-1">Payload preview</p>
                            <p>{`{`}</p>
                            <p className="pl-4">{`"trigger": "${trigger}",`}</p>
                            <p className="pl-4">{`"orgId":   "<your-org-id>",`}</p>
                            <p className="pl-4">{`"contextData": { ... },`}</p>
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
                            disabled={isPending || !name || !trigger || !webhookUrl}
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
