"use client";

import { useState, useRef } from "react";
import axios from "axios";
import {
    Plus, Trash2, Upload, Loader2, CheckCircle2,
    FileText, File as FileIcon, AlertCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

export const KYB_DOC_TYPE_OPTIONS = [
    { value: "INCORPORATION_CERT", label: "📋 Certificate of Incorporation", hint: "MoA, AoA, or CoI issued by the registrar" },
    { value: "TAX_CERTIFICATE", label: "🧾 Tax Registration Certificate", hint: "GSTIN / VAT / EIN registration proof" },
    { value: "ADDRESS_PROOF", label: "📍 Address Proof", hint: "Utility bill, bank statement, lease deed" },
    { value: "LEGAL_COMPLIANCE", label: "⚖️ Legal / Compliance Document", hint: "Regulatory filings, licences, etc." },
    { value: "OTHER_KYB", label: "📎 Other KYB Document", hint: "Any other supporting document" },
] as const;

export type KybDocType = typeof KYB_DOC_TYPE_OPTIONS[number]["value"];

export interface UploadedDoc {
    docId: string;
    sourceUrl: string;
    docType: KybDocType;
    title: string;
    taxRefNumber: string;
}

// ─── Single-slot state ────────────────────────────────────────────────────────

interface DocSlot {
    uid: string;       // client-side key
    docType: KybDocType | "";
    title: string;       // auto-filled from docType, user-editable
    taxRefNumber: string;       // optional reference number
    file: File | null;
    status: "idle" | "uploading" | "done" | "error";
    error: string;
    result: UploadedDoc | null;
}

const makeSlot = (): DocSlot => ({
    uid: Math.random().toString(36).slice(2),
    docType: "",
    title: "",
    taxRefNumber: "",
    file: null,
    status: "idle",
    error: "",
    result: null,
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrgDocumentUploaderProps {
    /** Organisation ID — needed once the org is created to create the DB row.
     *  Pass `null` during the initial Create flow; docs will be queued and
     *  persisted by passing them to the parent via `onChange`. */
    orgId: string | null;
    onChange: (docs: UploadedDoc[]) => void;
    disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgDocumentUploader({ orgId, onChange, disabled = false }: OrgDocumentUploaderProps) {
    const [slots, setSlots] = useState<DocSlot[]>([makeSlot()]);
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // ── Helpers ───────────────────────────────────────────────────────────────

    const updateSlot = (uid: string, patch: Partial<DocSlot>) =>
        setSlots((prev) => {
            const next = prev.map((s) => s.uid === uid ? { ...s, ...patch } : s);
            // Notify parent with all completed docs
            onChange(next.filter((s) => s.result).map((s) => s.result!));
            return next;
        });

    const addSlot = () => setSlots((prev) => [...prev, makeSlot()]);

    const removeSlot = (uid: string) =>
        setSlots((prev) => {
            const next = prev.filter((s) => s.uid !== uid);
            onChange(next.filter((s) => s.result).map((s) => s.result!));
            return next;
        });

    // ── Upload ────────────────────────────────────────────────────────────────

    const uploadSlot = async (slot: DocSlot) => {
        if (!slot.file || !slot.docType || !slot.title.trim()) return;

        updateSlot(slot.uid, { status: "uploading", error: "" });

        try {
            const fd = new FormData();
            fd.append("file", slot.file);
            fd.append("docType", slot.docType);
            fd.append("title", slot.title.trim());
            fd.append("taxRefNumber", slot.taxRefNumber.trim());
            if (orgId) fd.append("orgId", orgId);

            const { data } = await axios.post<{ docId: string; sourceUrl: string }>(
                "/api/org-documents/upload",
                fd,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const result: UploadedDoc = {
                docId: data.docId,
                sourceUrl: data.sourceUrl,
                docType: slot.docType as KybDocType,
                title: slot.title.trim(),
                taxRefNumber: slot.taxRefNumber.trim(),
            };

            updateSlot(slot.uid, { status: "done", result });
        } catch (err: any) {
            const msg = err?.response?.data?.error || err.message || "Upload failed";
            updateSlot(slot.uid, { status: "error", error: msg });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const completedCount = slots.filter((s) => s.status === "done").length;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                        Supporting Documents
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Upload PDFs or images (max 10 MB each). Files are stored securely on Cloudinary
                        and used for verification and AI-powered org insights.
                    </p>
                </div>
                {completedCount > 0 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {completedCount} uploaded
                    </span>
                )}
            </div>

            {/* Slots */}
            <div className="space-y-3">
                {slots.map((slot, idx) => {
                    const isDone = slot.status === "done";
                    const isUploading = slot.status === "uploading";
                    const hasError = slot.status === "error";

                    return (
                        <div
                            key={slot.uid}
                            className={cn(
                                "rounded-xl border p-4 space-y-3 transition-colors",
                                isDone ? "border-emerald-200 bg-emerald-50/40"
                                    : hasError ? "border-red-200 bg-red-50/30"
                                        : "border-gray-100 bg-gray-50/50"
                            )}
                        >
                            {/* Top row: type + remove */}
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs text-gray-500 mb-1 block">
                                        Document Type <span className="text-red-400">*</span>
                                    </label>
                                    <Select
                                        value={slot.docType}
                                        onValueChange={(v) => {
                                            const opt = KYB_DOC_TYPE_OPTIONS.find((o) => o.value === v);
                                            updateSlot(slot.uid, {
                                                docType: v as KybDocType,
                                                title: opt?.label.replace(/^[^\w]+/, "").trim() || "",
                                            });
                                        }}
                                        disabled={isDone || disabled}
                                    >
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select document type…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {KYB_DOC_TYPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <div>
                                                        <p className="text-sm">{opt.label}</p>
                                                        <p className="text-xs text-gray-400">{opt.hint}</p>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Remove button */}
                                {slots.length > 1 && !isDone && (
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(slot.uid)}
                                        disabled={isUploading || disabled}
                                        className="mt-5 p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                        title="Remove"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Middle row: label + ref number */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">
                                        Document Label <span className="text-red-400">*</span>
                                    </label>
                                    <Input
                                        placeholder="e.g. Certificate of Incorporation"
                                        value={slot.title}
                                        onChange={(e) => updateSlot(slot.uid, { title: e.target.value })}
                                        disabled={isDone || isUploading || disabled}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">
                                        Reference Number <span className="text-gray-400 font-normal">(CIN / GSTIN / EIN)</span>
                                    </label>
                                    <Input
                                        placeholder="e.g. 22AAAAA0000A1Z5"
                                        value={slot.taxRefNumber}
                                        onChange={(e) => updateSlot(slot.uid, { taxRefNumber: e.target.value })}
                                        disabled={isDone || isUploading || disabled}
                                        className="h-9 text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* File pick + upload */}
                            {isDone ? (
                                /* Done state */
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate font-medium">{slot.title}</span>
                                        {slot.taxRefNumber && (
                                            <span className="font-mono text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                {slot.taxRefNumber}
                                            </span>
                                        )}
                                    </div>
                                    <a
                                        href={slot.result!.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-indigo-500 hover:underline flex-shrink-0"
                                    >
                                        View <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            ) : (
                                /* Upload row */
                                <div className="flex items-center gap-3">
                                    {/* Hidden input */}
                                    <input
                                        ref={(el) => { fileRefs.current[slot.uid] = el; }}
                                        type="file"
                                        accept=".pdf,image/*"
                                        className="hidden"
                                        disabled={isUploading || disabled}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] ?? null;
                                            updateSlot(slot.uid, { file: f, status: "idle", error: "" });
                                        }}
                                    />

                                    {/* Pick file button */}
                                    <button
                                        type="button"
                                        onClick={() => fileRefs.current[slot.uid]?.click()}
                                        disabled={isUploading || disabled}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                                            slot.file
                                                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                                : "border-gray-200 bg-white text-gray-500 hover:border-indigo-200 hover:text-indigo-600"
                                        )}
                                    >
                                        {slot.file
                                            ? <><FileText className="h-4 w-4" /><span className="max-w-[140px] truncate">{slot.file.name}</span></>
                                            : <><FileIcon className="h-4 w-4" />Choose file</>
                                        }
                                    </button>

                                    {/* Upload button */}
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={!slot.file || !slot.docType || !slot.title.trim() || isUploading || disabled}
                                        onClick={() => uploadSlot(slot)}
                                        className="gap-1.5 flex-shrink-0"
                                    >
                                        {isUploading
                                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                                            : <><Upload className="h-3.5 w-3.5" /> Upload</>
                                        }
                                    </Button>

                                    {hasError && (
                                        <div className="flex items-center gap-1 text-xs text-red-500">
                                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{slot.error}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add another */}
            <button
                type="button"
                onClick={addSlot}
                disabled={disabled}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-40"
            >
                <Plus className="h-4 w-4" />
                Add another document
            </button>
        </div>
    );
}
