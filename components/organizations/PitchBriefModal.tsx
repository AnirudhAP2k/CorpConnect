"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { X, FileText, MapPin, Calendar, DollarSign, Users, ListChecks, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { AIEventBrief } from "@/lib/ai-service";
import { createPitchAction, submitPitchAction } from "@/domain/pitches";
import { useRouter } from "next/navigation";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PitchBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    brief: AIEventBrief;
    userId: string;
    organizationId: string;
}

// ─── PitchBriefModal ──────────────────────────────────────────────────────────

export function PitchBriefModal({
    isOpen,
    onClose,
    brief,
    userId,
    organizationId,
}: PitchBriefModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSaving, setIsSaving] = useState(false);
    const [step, setStep] = useState<"review" | "success">("review");
    const [pitchId, setPitchId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Editable fields — pre-filled from the AI brief
    const [title, setTitle]       = useState(brief.title);
    const [description, setDesc]  = useState(brief.description);
    const [location, setLocation] = useState(brief.location ?? "");
    const [budget, setBudget]     = useState<string>(
        brief.estimatedBudget?.toString() ?? ""
    );
    const [audience, setAudience] = useState(brief.targetAudience ?? "");

    if (!isOpen) return null;

    const handleSaveDraft = async () => {
        setError(null);
        setIsSaving(true);
        const result = await createPitchAction({
            organizationId,
            proposedById:    userId,
            title,
            description,
            aiBrief:         brief.aiBrief,
            location:        location || null,
            estimatedBudget: budget ? parseFloat(budget) : null,
            targetAudience:  audience || null,
            agenda:          brief.agenda,
            startDateTime:   brief.startDateTime,
            endDateTime:     brief.endDateTime,
        });
        setIsSaving(false);

        if (!result.success) { setError(result.error); return; }
        setPitchId(result.data.id);
        setStep("success");
    };

    const handleSubmitPitch = async () => {
        if (!pitchId) return;
        setError(null);
        startTransition(async () => {
            const result = await submitPitchAction(pitchId, userId);
            if (!result.success) { setError(result.error); return; }
            router.push(`/organizations/${organizationId}/pitches`);
            onClose();
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-nx-outline-variant/60 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-nx-primary" />
                            <h2 className="text-base font-headline font-bold text-nx-on-surface">
                                {step === "review" ? "Review Your Event Brief" : "Pitch Saved! 🎉"}
                            </h2>
                        </div>
                        <p className="text-xs text-nx-on-surface-variant">
                            {step === "review"
                                ? "Edit the details below before pitching to your admin."
                                : "Your pitch has been saved. Ready to submit it for review?"}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-nx-surface-container transition-colors" aria-label="Close">
                        <X className="w-4 h-4 text-nx-on-surface-variant" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {step === "review" ? (
                        <>
                            {/* Title */}
                            <div>
                                <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 block">Event Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm text-nx-on-surface focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                                    maxLength={80}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 block">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDesc(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm text-nx-on-surface resize-none focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                                />
                            </div>

                            {/* Row: location + budget */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Location
                                    </label>
                                    <input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="City / Virtual"
                                        className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" /> Est. Budget (USD)
                                    </label>
                                    <input
                                        type="number"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                        min={0}
                                        placeholder="e.g. 5000"
                                        className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                                    />
                                </div>
                            </div>

                            {/* Target audience */}
                            <div>
                                <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Target Audience
                                </label>
                                <input
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    placeholder="e.g. Senior tech leaders, Series A founders…"
                                    className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                                />
                            </div>

                            {/* Agenda preview */}
                            {brief.agenda && brief.agenda.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <ListChecks className="w-3 h-3" /> Proposed Agenda
                                    </label>
                                    <div className="space-y-1.5">
                                        {brief.agenda.map((item, i) => (
                                            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-nx-surface-container border border-nx-outline-variant/60 text-sm">
                                                {item.time && (
                                                    <span className="shrink-0 text-xs text-nx-on-surface-variant font-medium w-12">{item.time}</span>
                                                )}
                                                <span className="text-nx-on-surface">{item.item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Brief preview */}
                            <div>
                                <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 block">AI-Generated Brief (sent to admin)</label>
                                <div className="px-4 py-3 rounded-xl bg-nx-primary-container/30 border border-nx-primary/20 text-sm text-nx-on-surface leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {brief.aiBrief}
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
                        </>
                    ) : (
                        /* Success state */
                        <div className="flex flex-col items-center text-center py-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-headline font-bold text-nx-on-surface mb-2">Draft Saved!</h3>
                            <p className="text-sm text-nx-on-surface-variant max-w-sm">
                                Your pitch for <strong>"{title}"</strong> has been saved. Submit it now to send it to your organization's admin for review.
                            </p>
                            {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-nx-outline-variant/60 flex items-center justify-end gap-3 shrink-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-nx-on-surface-variant hover:bg-nx-surface-container transition-colors"
                    >
                        {step === "success" ? "Close" : "Cancel"}
                    </button>

                    {step === "review" ? (
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving || !title.trim()}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                                !isSaving && title.trim()
                                    ? "bg-nx-primary text-white hover:opacity-90 shadow-sm"
                                    : "bg-nx-surface-container-high text-nx-on-surface-variant/40 cursor-not-allowed"
                            )}
                        >
                            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save as Draft
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitPitch}
                            disabled={isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-nx-primary text-white hover:opacity-90 shadow-sm transition-all"
                        >
                            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Submit to Admin
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
