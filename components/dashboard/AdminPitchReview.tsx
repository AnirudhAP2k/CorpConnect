"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle, XCircle, RotateCcw, Eye, Clock, DollarSign, MapPin, Users, ListChecks, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Image from "next/image";
import { reviewPitchAction } from "@/domain/pitches";
import type { SerializedEventPitch } from "@/domain/pitches";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminPitchReviewProps {
    pitch: SerializedEventPitch;
    adminUserId: string;
    onReviewed?: () => void;
}

// ─── Review Actions ───────────────────────────────────────────────────────────

type ReviewAction = "APPROVED" | "REJECTED" | "IN_REVIEW" | "REVISION_REQUESTED";

const REVIEW_BUTTONS: {
    action: ReviewAction;
    label: string;
    icon: React.ReactNode;
    classes: string;
}[] = [
    {
        action: "IN_REVIEW",
        label: "Mark In Review",
        icon: <Eye className="w-3.5 h-3.5" />,
        classes: "border-blue-200 text-blue-700 hover:bg-blue-50",
    },
    {
        action: "REVISION_REQUESTED",
        label: "Request Revision",
        icon: <RotateCcw className="w-3.5 h-3.5" />,
        classes: "border-orange-200 text-orange-700 hover:bg-orange-50",
    },
    {
        action: "REJECTED",
        label: "Reject",
        icon: <XCircle className="w-3.5 h-3.5" />,
        classes: "border-red-200 text-red-700 hover:bg-red-50",
    },
    {
        action: "APPROVED",
        label: "Approve",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        classes: "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600",
    },
];

// ─── AdminPitchReview ─────────────────────────────────────────────────────────

export function AdminPitchReview({
    pitch,
    adminUserId,
    onReviewed,
}: AdminPitchReviewProps) {
    const [expanded, setExpanded] = useState(false);
    const [adminNotes, setAdminNotes] = useState(pitch.adminNotes ?? "");
    const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const submittedAgo = formatDistanceToNow(new Date(pitch.updatedAt), { addSuffix: true });

    const handleReview = (action: ReviewAction) => {
        setErrorMsg(null);
        setPendingAction(action);
        startTransition(async () => {
            const result = await reviewPitchAction(pitch.id, adminUserId, {
                status: action,
                adminNotes: adminNotes || undefined,
            });
            setPendingAction(null);
            if (!result.success) { setErrorMsg(result.error); return; }
            onReviewed?.();
        });
    };

    return (
        <div className={cn(
            "rounded-2xl border bg-white overflow-hidden transition-all duration-200",
            pitch.status === "PITCHED" ? "border-blue-200 shadow-sm" : "border-nx-outline-variant"
        )}>
            {/* Card header */}
            <div
                className="flex items-start gap-4 p-5 cursor-pointer hover:bg-nx-surface-container/40 transition-colors"
                onClick={() => setExpanded((v) => !v)}
                role="button"
                aria-expanded={expanded}
            >
                {/* Author avatar */}
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-nx-surface-container border border-nx-outline-variant shrink-0">
                    {pitch.proposedBy?.image ? (
                        <Image src={pitch.proposedBy.image} alt={pitch.proposedBy.name ?? ""} width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                            {(pitch.proposedBy?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-nx-on-surface line-clamp-1">{pitch.title}</h4>
                        {expanded
                            ? <ChevronUp className="w-4 h-4 text-nx-on-surface-variant shrink-0 mt-0.5" />
                            : <ChevronDown className="w-4 h-4 text-nx-on-surface-variant shrink-0 mt-0.5" />
                        }
                    </div>
                    <p className="text-xs text-nx-on-surface-variant mt-0.5">
                        by {pitch.proposedBy?.name ?? "Unknown"} · submitted {submittedAgo}
                    </p>
                    {!expanded && (
                        <p className="text-xs text-nx-on-surface mt-1.5 line-clamp-2">{pitch.description}</p>
                    )}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-nx-outline-variant/40">
                    {/* Description */}
                    <div className="pt-4">
                        <p className="text-sm text-nx-on-surface leading-relaxed">{pitch.description}</p>
                    </div>

                    {/* Key facts */}
                    <div className="grid grid-cols-2 gap-3">
                        {pitch.location && (
                            <div className="flex items-center gap-2 text-xs text-nx-on-surface-variant">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {pitch.location}
                            </div>
                        )}
                        {pitch.estimatedBudget !== null && (
                            <div className="flex items-center gap-2 text-xs text-nx-on-surface-variant">
                                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                ${pitch.estimatedBudget.toLocaleString()} estimated
                            </div>
                        )}
                        {pitch.targetAudience && (
                            <div className="flex items-center gap-2 text-xs text-nx-on-surface-variant col-span-2">
                                <Users className="w-3.5 h-3.5 shrink-0" />
                                {pitch.targetAudience}
                            </div>
                        )}
                        {pitch.startDateTime && (
                            <div className="flex items-center gap-2 text-xs text-nx-on-surface-variant">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {format(new Date(pitch.startDateTime), "MMM d, yyyy")}
                            </div>
                        )}
                    </div>

                    {/* Agenda */}
                    {pitch.agenda && pitch.agenda.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-1">
                                <ListChecks className="w-3.5 h-3.5" /> Agenda
                            </p>
                            <div className="space-y-1.5">
                                {pitch.agenda.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-nx-surface-container border border-nx-outline-variant/60 text-xs">
                                        {item.time && <span className="shrink-0 font-medium text-nx-on-surface-variant w-12">{item.time}</span>}
                                        <span className="text-nx-on-surface">{item.item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI Brief */}
                    <div>
                        <p className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-2">AI Executive Brief</p>
                        <div className="px-4 py-3 rounded-xl bg-nx-primary-container/20 border border-nx-primary/15 text-xs text-nx-on-surface leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {pitch.aiBrief}
                        </div>
                    </div>

                    {/* Admin notes input */}
                    <div>
                        <label className="text-xs font-semibold text-nx-on-surface-variant uppercase tracking-wider mb-1.5 block">
                            Your Notes (optional — sent back to member)
                        </label>
                        <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={2}
                            placeholder="Feedback, suggestions, or reasons for your decision…"
                            className="w-full px-3 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-xs text-nx-on-surface resize-none focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10"
                        />
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{errorMsg}</p>
                    )}

                    {/* Review action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {REVIEW_BUTTONS.map((btn) => (
                            <button
                                key={btn.action}
                                onClick={() => handleReview(btn.action)}
                                disabled={isPending}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                                    btn.classes,
                                    isPending && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isPending && pendingAction === btn.action ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : btn.icon}
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
