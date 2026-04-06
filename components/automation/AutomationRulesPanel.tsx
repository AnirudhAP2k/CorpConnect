"use client";

import { useState, useTransition, useEffect } from "react";
import { Zap, Plus, Trash2, Play, PauseCircle, PlayCircle, RefreshCw, AlertCircle, FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    listAutomationRules,
    toggleAutomationRule,
    deleteAutomationRule,
    testAutomationRule,
} from "@/actions/automation.actions";
import type { AutomationRuleData, AutomationTriggerType } from "@/actions/automation.actions";
import { TRIGGER_LABELS } from "@/actions/automation.actions";
import { AddRuleSheet } from "@/components/automation/AddRuleSheet";
import { formatDistanceToNow } from "date-fns";

const TRIGGER_COLORS: Record<AutomationTriggerType, string> = {
    EVENT_REGISTRATION: "bg-blue-100 text-blue-700",
    EVENT_CANCELLED: "bg-red-100 text-red-700",
    FEEDBACK_RECEIVED: "bg-purple-100 text-purple-700",
    CONNECTION_ACCEPTED: "bg-green-100 text-green-700",
    MEETING_SCHEDULED: "bg-amber-100 text-amber-700",
    NEW_MEMBER_JOINED: "bg-teal-100 text-teal-700",
};

function StatusDot({ status, lastRunStatus }: { status: string; lastRunStatus: string | null }) {
    if (status === "PAUSED") return <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" title="Paused" />;
    if (lastRunStatus === "error" || lastRunStatus === "timeout") return <span className="h-2 w-2 rounded-full bg-red-500 inline-block" title="Last run failed" />;
    return <span className="h-2 w-2 rounded-full bg-green-500 inline-block" title="Active" />;
}

function RuleRow({ rule, onToggle, onDelete, onTest }: {
    rule: AutomationRuleData;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onTest: (id: string) => void;
}) {
    const isActive = rule.status === "ACTIVE";

    const webhookHost = (() => {
        try { return new URL(rule.webhookUrl).hostname; }
        catch { return rule.webhookUrl; }
    })();

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors group">
            <StatusDot status={rule.status} lastRunStatus={rule.lastRunStatus} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{rule.name}</p>
                    <Badge className={`text-xs py-0 ${TRIGGER_COLORS[rule.trigger]}`}>
                        {TRIGGER_LABELS[rule.trigger]}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {webhookHost} · {rule.runCount} run{rule.runCount !== 1 ? "s" : ""}
                    {rule.lastRunAt && (
                        <> · last {formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}</>
                    )}
                    {rule.lastRunStatus === "error" && (
                        <span className="text-red-500 ml-1">· last run failed</span>
                    )}
                </p>
            </div>

            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    id={`rule-test-${rule.id}`}
                    title="Send test trigger"
                    onClick={() => onTest(rule.id)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    <FlaskConical className="h-3.5 w-3.5" />
                </button>
                <button
                    id={`rule-toggle-${rule.id}`}
                    title={isActive ? "Pause rule" : "Activate rule"}
                    onClick={() => onToggle(rule.id)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isActive
                        ? <PauseCircle className="h-3.5 w-3.5" />
                        : <PlayCircle className="h-3.5 w-3.5 text-green-600" />
                    }
                </button>
                <button
                    id={`rule-delete-${rule.id}`}
                    title="Delete rule"
                    onClick={() => onDelete(rule.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

export function AutomationRulesPanel({ orgId }: { orgId: string }) {
    const [rules, setRules] = useState<AutomationRuleData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const load = () => {
        startTransition(async () => {
            const res = await listAutomationRules(orgId);
            if (res.success) { setRules(res.data); setError(null); }
            else setError(res.error);
        });
    };

    useEffect(() => { load(); }, [orgId]);

    const handleToggle = (ruleId: string) => {
        startTransition(async () => {
            const res = await toggleAutomationRule(ruleId);
            if (res.success) {
                setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: res.status } : r));
                showToast(`Rule ${res.status === "ACTIVE" ? "activated" : "paused"}.`);
            } else {
                showToast(res.error);
            }
        });
    };

    const handleDelete = (ruleId: string) => {
        startTransition(async () => {
            const res = await deleteAutomationRule(ruleId);
            if (res.success) {
                setRules(prev => prev.filter(r => r.id !== ruleId));
                showToast("Rule deleted.");
            } else {
                showToast(res.error);
            }
        });
    };

    const handleTest = (ruleId: string) => {
        startTransition(async () => {
            const res = await testAutomationRule(ruleId);
            if (res.success) showToast(`Test job enqueued (job ${res.jobId.slice(0, 8)}…). It will fire within ~1 min.`);
            else showToast(res.error);
        });
    };

    const handleRuleCreated = (rule: AutomationRuleData) => {
        setRules(prev => [rule, ...prev]);
        showToast(`Rule "${rule.name}" created.`);
    };

    return (
        <>
            <Card id="automation-panel">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="h-5 w-5 text-primary" />
                            Automation Rules
                        </CardTitle>
                        <CardDescription>Trigger n8n workflows on platform events</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            id="automation-refresh-btn"
                            variant="ghost"
                            size="sm"
                            onClick={load}
                            disabled={isPending}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                            id="automation-add-btn"
                            size="sm"
                            className="gap-1"
                            onClick={() => setAddOpen(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Rule
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-destructive mb-3">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {isPending && rules.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8 animate-pulse">
                            Loading rules…
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                            <Zap className="h-10 w-10 text-muted-foreground/30" />
                            <p className="font-medium text-sm">No automation rules yet</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Create a rule to automatically trigger n8n workflows when events happen in your organization — like new registrations, accepted connections, or member joins.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 mt-1"
                                onClick={() => setAddOpen(true)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Create your first rule
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {rules.map(r => (
                                <RuleRow
                                    key={r.id}
                                    rule={r}
                                    onToggle={handleToggle}
                                    onDelete={handleDelete}
                                    onTest={handleTest}
                                />
                            ))}
                        </div>
                    )}

                    {/* Active count summary */}
                    {rules.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                            {rules.filter(r => r.status === "ACTIVE").length} active · {rules.filter(r => r.status === "PAUSED").length} paused
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background text-sm px-4 py-2.5 rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
                    {toast}
                </div>
            )}

            <AddRuleSheet
                orgId={orgId}
                open={addOpen}
                onOpenChange={setAddOpen}
                onRuleCreated={handleRuleCreated}
            />
        </>
    );
}
