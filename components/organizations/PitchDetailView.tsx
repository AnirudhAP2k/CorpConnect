"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    FileText, MapPin, DollarSign, Clock, ListChecks, CheckCircle, ArrowLeft,
    RotateCcw, Sparkles, Edit2, Save, X, Plus, Trash2, Loader2, Send, GripVertical
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { updatePitchAction, submitPitchAction } from "@/domain/pitches";
import type { SerializedEventPitch } from "@/domain/pitches";

interface PitchDetailViewProps {
    pitch: SerializedEventPitch;
    organizationId: string;
    isAdmin: boolean;
    isAuthor: boolean;
}

export function PitchDetailView({
    pitch: initialPitch,
    organizationId,
    isAdmin,
    isAuthor,
}: PitchDetailViewProps) {
    const router = useRouter();
    const [pitch, setPitch] = useState<SerializedEventPitch>(initialPitch);
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Form states for editing
    const [title, setTitle]             = useState(pitch.title);
    const [description, setDesc]        = useState(pitch.description);
    const [location, setLocation]       = useState(pitch.location ?? "");
    const [budget, setBudget]           = useState<string>(pitch.estimatedBudget?.toString() ?? "");
    const [audience, setAudience]       = useState(pitch.targetAudience ?? "");
    const [aiBrief, setAiBrief]         = useState(pitch.aiBrief);
    const [startDateTime, setStartDateTime] = useState<string>(
        pitch.startDateTime ? format(new Date(pitch.startDateTime), "yyyy-MM-dd'T'HH:mm") : ""
    );
    const [endDateTime, setEndDateTime]     = useState<string>(
        pitch.endDateTime ? format(new Date(pitch.endDateTime), "yyyy-MM-dd'T'HH:mm") : ""
    );
    const [agenda, setAgenda]           = useState<{ time?: string; item: string }[]>(
        pitch.agenda ?? []
    );

    const canEdit = isAuthor && ["DRAFT", "REVISION_REQUESTED"].includes(pitch.status);
    const canSubmit = isAuthor && ["DRAFT", "REVISION_REQUESTED"].includes(pitch.status);

    // ── Agenda helpers ──
    const handleAgendaChange = (index: number, field: "time" | "item", val: string) => {
        setAgenda((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const handleAddAgendaItem = () => {
        setAgenda((prev) => [...prev, { time: "", item: "" }]);
    };

    const handleRemoveAgendaItem = (index: number) => {
        setAgenda((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = (targetIndex: number) => {
        if (draggedIndex === null || draggedIndex === targetIndex) return;
        setAgenda((prev) => {
            const next = [...prev];
            const [movedItem] = next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, movedItem);
            return next;
        });
        setDraggedIndex(null);
    };

    // ── Save Changes ──
    const handleSave = () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await updatePitchAction(pitch.id, {
                title,
                description,
                location: location || null,
                estimatedBudget: budget ? parseFloat(budget) : null,
                targetAudience: audience || null,
                aiBrief,
                startDateTime: startDateTime ? new Date(startDateTime).toISOString() : null,
                endDateTime: endDateTime ? new Date(endDateTime).toISOString() : null,
                agenda: agenda.filter((a) => a.item.trim().length > 0),
            });

            if (!res.success) {
                setErrorMsg(res.error);
                return;
            }

            setPitch(res.data);
            setIsEditing(false);
            setSuccessMsg("Pitch changes saved successfully.");
            router.refresh();
        });
    };

    // ── Submit Pitch ──
    const handleSubmit = () => {
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await submitPitchAction(pitch.id);
            if (!res.success) {
                setErrorMsg(res.error);
                return;
            }

            setPitch(res.data);
            setIsEditing(false);
            setSuccessMsg("Pitch submitted to Admin for review! 🚀");
            router.refresh();
        });
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-8">
            <div className="wrapper max-w-4xl space-y-6">
                {/* Back button */}
                <Link
                    href={`/organizations/${organizationId}/pitches`}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-nx-on-surface-variant hover:text-nx-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Event Pitches
                </Link>

                {/* Status Banners */}
                {successMsg && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                        <span>{successMsg}</span>
                        <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4 text-emerald-600" /></button>
                    </div>
                )}
                {errorMsg && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between">
                        <span>{errorMsg}</span>
                        <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4 text-red-600" /></button>
                    </div>
                )}

                {/* Pitch Details Container */}
                <div className="bg-white rounded-2xl border border-nx-outline-variant p-6 md:p-8 space-y-6 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-nx-outline-variant/60 pb-6">
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold border",
                                    pitch.status === "DRAFT" && "bg-nx-surface-container border-nx-outline-variant text-nx-on-surface-variant",
                                    pitch.status === "PITCHED" && "bg-blue-50 border-blue-200 text-blue-700",
                                    pitch.status === "REVISION_REQUESTED" && "bg-orange-50 border-orange-200 text-orange-700",
                                    pitch.status === "APPROVED" && "bg-emerald-50 border-emerald-200 text-emerald-700",
                                    pitch.status === "REJECTED" && "bg-red-50 border-red-200 text-red-700",
                                )}>
                                    {pitch.status.replace("_", " ")}
                                </span>
                                {pitch.proposedBy?.name && (
                                    <span className="text-xs text-nx-on-surface-variant">
                                        Proposed by <strong className="text-nx-on-surface">{pitch.proposedBy.name}</strong>
                                    </span>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-1 pt-1">
                                    <label className="text-[10px] font-bold text-nx-on-surface-variant uppercase">Title</label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-lg font-bold text-nx-on-surface focus:outline-none focus:border-nx-primary"
                                    />
                                </div>
                            ) : (
                                <h1 className="text-2xl font-bold text-nx-on-surface">{pitch.title}</h1>
                            )}
                        </div>

                        {/* Top Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {pitch.status === "APPROVED" && (
                                <Link href={`/organizations/${organizationId}/pitches/${pitch.id}/tasks`}>
                                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                        <ListChecks className="w-4 h-4" /> View Generated Tasklist
                                    </Button>
                                </Link>
                            )}

                            {canEdit && !isEditing && (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="outline"
                                    className="gap-2 border-nx-outline-variant hover:bg-nx-surface-container"
                                >
                                    <Edit2 className="w-4 h-4 text-nx-primary" /> Edit Pitch
                                </Button>
                            )}

                            {isEditing && (
                                <>
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        variant="ghost"
                                        size="sm"
                                        disabled={isPending}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isPending || !title.trim()}
                                        className="gap-2 bg-nx-primary text-white shadow-sm"
                                    >
                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </Button>
                                </>
                            )}

                            {canSubmit && !isEditing && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                >
                                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Submit to Admin
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Admin Notes / Rejection / Revision Banner */}
                    {pitch.adminNotes && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <RotateCcw className="w-4 h-4 text-amber-700" /> Admin Feedback
                            </p>
                            <p className="leading-relaxed">{pitch.adminNotes}</p>
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider">Event Description</h3>
                        {isEditing ? (
                            <textarea
                                value={description}
                                onChange={(e) => setDesc(e.target.value)}
                                rows={4}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container text-sm text-nx-on-surface leading-relaxed focus:outline-none focus:border-nx-primary"
                            />
                        ) : (
                            <p className="text-sm text-nx-on-surface leading-relaxed">{pitch.description}</p>
                        )}
                    </div>

                    {/* Quick Metadata Grid / Inputs */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider">Event Logistics & Budget</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl bg-nx-surface-container/50 border border-nx-outline-variant/40 text-xs">
                            {/* Location */}
                            <div>
                                <span className="text-nx-on-surface-variant block text-[10px] font-bold uppercase mb-1">Location</span>
                                {isEditing ? (
                                    <input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="City / Virtual"
                                        className="w-full px-3 py-1.5 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                    />
                                ) : (
                                    <div className="flex items-center gap-1.5 text-nx-on-surface font-semibold">
                                        <MapPin className="w-3.5 h-3.5 text-nx-primary shrink-0" />
                                        {pitch.location || "Not specified"}
                                    </div>
                                )}
                            </div>

                            {/* Estimated Budget */}
                            <div>
                                <span className="text-nx-on-surface-variant block text-[10px] font-bold uppercase mb-1">Estimated Budget (USD)</span>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={budget}
                                        onChange={(e) => setBudget(e.target.value)}
                                        placeholder="e.g. 5000"
                                        className="w-full px-3 py-1.5 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                    />
                                ) : (
                                    <div className="flex items-center gap-1.5 text-nx-on-surface font-semibold">
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        {pitch.estimatedBudget !== null ? `$${pitch.estimatedBudget.toLocaleString()}` : "Not specified"}
                                    </div>
                                )}
                            </div>

                            {/* Target Audience */}
                            <div>
                                <span className="text-nx-on-surface-variant block text-[10px] font-bold uppercase mb-1">Target Audience</span>
                                {isEditing ? (
                                    <input
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        placeholder="e.g. CTOs, Tech leads"
                                        className="w-full px-3 py-1.5 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                    />
                                ) : (
                                    <div className="text-nx-on-surface font-semibold">
                                        {pitch.targetAudience || "General Audience"}
                                    </div>
                                )}
                            </div>

                            {/* Start Date */}
                            <div>
                                <span className="text-nx-on-surface-variant block text-[10px] font-bold uppercase mb-1">Start Date & Time</span>
                                {isEditing ? (
                                    <input
                                        type="datetime-local"
                                        value={startDateTime}
                                        onChange={(e) => setStartDateTime(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                    />
                                ) : (
                                    <div className="flex items-center gap-1.5 text-nx-on-surface font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-nx-primary shrink-0" />
                                        {pitch.startDateTime ? format(new Date(pitch.startDateTime), "PPP p") : "Not specified"}
                                    </div>
                                )}
                            </div>

                            {/* End Date */}
                            <div>
                                <span className="text-nx-on-surface-variant block text-[10px] font-bold uppercase mb-1">End Date & Time</span>
                                {isEditing ? (
                                    <input
                                        type="datetime-local"
                                        value={endDateTime}
                                        onChange={(e) => setEndDateTime(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                    />
                                ) : (
                                    <div className="flex items-center gap-1.5 text-nx-on-surface font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-nx-primary shrink-0" />
                                        {pitch.endDateTime ? format(new Date(pitch.endDateTime), "PPP p") : "Not specified"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Agenda */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                                <ListChecks className="w-4 h-4 text-nx-primary" /> Proposed Agenda
                            </h3>
                            {isEditing && (
                                <button
                                    onClick={handleAddAgendaItem}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-nx-primary hover:underline"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Agenda Item
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-2">
                                {agenda.map((item, i) => (
                                    <div
                                        key={i}
                                        draggable
                                        onDragStart={() => handleDragStart(i)}
                                        onDragOver={(e) => handleDragOver(e, i)}
                                        onDrop={() => handleDrop(i)}
                                        onDragEnd={() => setDraggedIndex(null)}
                                        className={cn(
                                            "flex items-center gap-2 p-1.5 rounded-xl border border-nx-outline-variant/60 bg-nx-surface-container transition-all",
                                            draggedIndex === i && "opacity-40 border-dashed border-nx-primary bg-nx-primary/5"
                                        )}
                                    >
                                        <div
                                            className="cursor-grab active:cursor-grabbing p-1.5 text-nx-on-surface-variant/60 hover:text-nx-on-surface hover:bg-white rounded-lg transition-colors shrink-0"
                                            title="Drag to reorder"
                                        >
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                        <input
                                            value={item.time ?? ""}
                                            onChange={(e) => handleAgendaChange(i, "time", e.target.value)}
                                            placeholder="Time (e.g. 10:00 AM)"
                                            className="w-32 px-3 py-2 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                        />
                                        <input
                                            value={item.item}
                                            onChange={(e) => handleAgendaChange(i, "item", e.target.value)}
                                            placeholder="Agenda activity description…"
                                            className="flex-1 px-3 py-2 rounded-lg border border-nx-outline-variant bg-white text-xs"
                                        />
                                        <button
                                            onClick={() => handleRemoveAgendaItem(i)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            aria-label="Remove item"
                                            title="Delete item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {agenda.length === 0 && (
                                    <p className="text-xs text-nx-on-surface-variant italic">No agenda items added yet.</p>
                                )}
                            </div>
                        ) : (
                            pitch.agenda && pitch.agenda.length > 0 ? (
                                <div className="space-y-2">
                                    {pitch.agenda.map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-nx-outline-variant/60 text-xs">
                                            {item.time && (
                                                <span className="font-semibold text-nx-primary shrink-0 min-w-[110px] whitespace-pre-line leading-snug">{item.time}</span>
                                            )}
                                            <span className="text-nx-on-surface leading-relaxed flex-1">{item.item}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-nx-on-surface-variant italic">No agenda specified.</p>
                            )
                        )}
                    </div>

                    {/* Full AI Executive Brief */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" /> AI Executive Pitch Brief
                        </h3>
                        {isEditing ? (
                            <textarea
                                value={aiBrief}
                                onChange={(e) => setAiBrief(e.target.value)}
                                rows={8}
                                className="w-full p-4 rounded-2xl bg-nx-primary-container/20 border border-nx-primary/30 text-xs text-nx-on-surface font-mono leading-relaxed focus:outline-none focus:border-nx-primary"
                            />
                        ) : (
                            <div className="p-5 rounded-2xl bg-nx-primary-container/20 border border-nx-primary/15 text-xs text-nx-on-surface leading-relaxed whitespace-pre-wrap">
                                {pitch.aiBrief}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
