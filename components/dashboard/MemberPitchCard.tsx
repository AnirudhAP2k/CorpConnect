"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, CheckCircle, XCircle, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { SerializedEventPitch, PitchStatus } from "@/domain/pitches";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PitchStatus, { label: string; icon: React.ReactNode; classes: string }> = {
    DRAFT:              { label: "Draft",              icon: <FileText className="w-3.5 h-3.5" />,     classes: "bg-nx-surface-container border-nx-outline-variant text-nx-on-surface-variant" },
    PITCHED:            { label: "Submitted",          icon: <Clock className="w-3.5 h-3.5" />,         classes: "bg-blue-50 border-blue-200 text-blue-700" },
    IN_REVIEW:          { label: "Under Review",       icon: <Clock className="w-3.5 h-3.5" />,         classes: "bg-amber-50 border-amber-200 text-amber-700" },
    REVISION_REQUESTED: { label: "Revision Needed",   icon: <RotateCcw className="w-3.5 h-3.5" />,     classes: "bg-orange-50 border-orange-200 text-orange-700" },
    APPROVED:           { label: "Approved! 🎉",       icon: <CheckCircle className="w-3.5 h-3.5" />,   classes: "bg-emerald-50 border-emerald-200 text-emerald-700" },
    REJECTED:           { label: "Not Approved",       icon: <XCircle className="w-3.5 h-3.5" />,       classes: "bg-red-50 border-red-200 text-red-700" },
};

// ─── MemberPitchCard ──────────────────────────────────────────────────────────

interface MemberPitchCardProps {
    pitch: SerializedEventPitch;
    organizationId: string;
}

export function MemberPitchCard({ pitch, organizationId }: MemberPitchCardProps) {
    const statusCfg = STATUS_CONFIG[pitch.status];
    const updatedAgo = formatDistanceToNow(new Date(pitch.updatedAt), { addSuffix: true });

    return (
        <Link
            href={`/organizations/${organizationId}/pitches/${pitch.id}`}
            className="block group"
        >
            <div className={cn(
                "rounded-2xl border bg-white p-5 transition-all duration-200",
                "hover:shadow-md hover:-translate-y-0.5",
                pitch.status === "APPROVED" && "border-emerald-200 bg-emerald-50/30",
                pitch.status === "REVISION_REQUESTED" && "border-orange-200",
                pitch.status === "REJECTED" && "border-red-100",
            )}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        {/* Pitch icon */}
                        <div className="w-10 h-10 rounded-xl bg-nx-primary-container/40 border border-nx-primary/20 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-nx-primary" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-nx-on-surface line-clamp-1 group-hover:text-nx-primary transition-colors">
                                {pitch.title}
                            </h4>
                            <p className="text-xs text-nx-on-surface-variant mt-0.5">Updated {updatedAgo}</p>
                        </div>
                    </div>

                    {/* Status badge */}
                    <span className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold",
                        statusCfg.classes
                    )}>
                        {statusCfg.icon}
                        {statusCfg.label}
                    </span>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-nx-on-surface-variant mt-3 line-clamp-2 leading-relaxed">
                    {pitch.description}
                </p>

                {/* Admin notes (revision/rejection feedback) */}
                {pitch.adminNotes && (pitch.status === "REVISION_REQUESTED" || pitch.status === "REJECTED") && (
                    <div className={cn(
                        "mt-3 px-3 py-2.5 rounded-xl border text-xs leading-relaxed",
                        pitch.status === "REVISION_REQUESTED"
                            ? "bg-orange-50 border-orange-200 text-orange-800"
                            : "bg-red-50 border-red-200 text-red-800"
                    )}>
                        <span className="font-semibold">Admin note: </span>
                        {pitch.adminNotes}
                    </div>
                )}

                {/* Footer: action hint */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-nx-outline-variant/40">
                    <div className="flex items-center gap-3 text-xs text-nx-on-surface-variant">
                        {pitch.location && <span>📍 {pitch.location}</span>}
                        {pitch.estimatedBudget && <span>💰 ${pitch.estimatedBudget.toLocaleString()}</span>}
                    </div>
                    <span className="text-xs text-nx-primary font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                        {pitch.status === "DRAFT" ? "Continue editing" : "View details"}
                        <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </Link>
    );
}
