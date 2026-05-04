"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    CheckCircle2, XCircle, Loader2, ExternalLink, Building2,
    Globe, Linkedin, Twitter, MapPin, Briefcase, Hash, BookOpen,
    Calendar, FileText, Receipt, FileCheck, ShieldAlert, Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

// ─── Types ─────────────────────────────────────────────────────────────────

interface OrgDoc {
    id: string;
    docType: string;
    title: string;
    taxRefNumber: string | null;
    sourceUrl: string | null;
    createdAt: Date;
}

interface OrgMeta {
    verificationStatus: string;
    verificationScore: number | null;
    verificationSummary: string | null;
    verificationReviewNote: string | null;
    registrationNumber: string | null;
    jurisdiction: string | null;
    taxId: string | null;
    incorporationDate: Date | null;
    registeredAddress: string | null;
    // URL fields removed — documents live in OrgDocument table
}

interface OrgDetailProps {
    org: {
        id: string;
        name: string;
        logo: string | null;
        description: string | null;
        website: string | null;
        linkedinUrl: string | null;
        twitterUrl: string | null;
        location: string | null;
        size: string | null;
        createdAt: Date;
        industry: { label: string };
        meta: OrgMeta | null;
        orgDocuments: OrgDoc[];
        _count: { members: number; events: number; participations: number };
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SCORE_COLOR = (s: number | null) =>
    s === null ? "text-gray-400" : s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-600" : "text-red-500";

const SCORE_BG = (s: number | null) =>
    s === null ? "bg-gray-50 border-gray-200"
        : s >= 80 ? "bg-emerald-50 border-emerald-200"
            : s >= 60 ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200";

const SCORE_BAR = (s: number | null) =>
    s !== null && s >= 80 ? "bg-emerald-500" : s !== null && s >= 60 ? "bg-amber-500" : "bg-red-400";

function docTypeIcon(docType: string) {
    switch (docType) {
        case "INCORPORATION_CERT": return FileCheck;
        case "TAX_CERTIFICATE": return Receipt;
        case "ADDRESS_PROOF": return MapPin;
        case "LEGAL_COMPLIANCE": return FileText;
        default: return FileText;
    }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OrgVerificationDetail({ org }: OrgDetailProps) {
    const router = useRouter();
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
    const [done, setDone] = useState<"approved" | "rejected" | null>(null);
    const [error, setError] = useState("");

    const meta = org.meta;
    const score = meta?.verificationScore ?? null;

    const handleAction = async (action: "approve" | "reject") => {
        setLoading(action);
        setError("");
        try {
            await axios.patch(`/api/admin/organizations/${org.id}/verify`, {
                action,
                note: note || undefined,
            });
            setDone(action === "approve" ? "approved" : "rejected");
            setTimeout(() => router.push("/admin/organizations/verify"), 1500);
        } catch (err: any) {
            setError(err?.response?.data?.error || "Something went wrong.");
            setLoading(null);
        }
    };

    if (done) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                {done === "approved"
                    ? <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                    : <XCircle className="h-16 w-16 text-red-500" />}
                <p className="text-xl font-semibold text-gray-800">
                    Organization {done === "approved" ? "Approved ✓" : "Rejected"}
                </p>
                <p className="text-sm text-gray-400">Redirecting to queue…</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {org.logo
                        ? <img src={org.logo} alt={org.name} className="h-full w-full object-cover" />
                        : <Building2 className="h-8 w-8 text-indigo-400" />}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{org.industry.label}</Badge>
                        {org.size && <Badge variant="outline">{org.size}</Badge>}
                        <Badge className="bg-amber-100 text-amber-700 border-0">⏳ Pending Review</Badge>
                        <span className="text-xs text-gray-400">
                            Registered {format(new Date(org.createdAt), "MMMM d, yyyy")}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: detail panels ─────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* AI Score */}
                    <div className={`rounded-2xl border p-5 ${SCORE_BG(score)}`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Level 1 KYB Score
                        </p>
                        <div className="flex items-end gap-3">
                            <span className={`text-5xl font-black ${SCORE_COLOR(score)}`}>{score ?? "—"}</span>
                            <span className="text-gray-400 text-lg mb-1">/100</span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-white/60 overflow-hidden border border-white/80">
                            <div
                                className={`h-full rounded-full ${SCORE_BAR(score)} transition-all`}
                                style={{ width: `${score ?? 0}%` }}
                            />
                        </div>
                        {meta?.verificationSummary && (
                            <p className="text-sm text-gray-600 mt-3 leading-relaxed italic">
                                "{meta.verificationSummary}"
                            </p>
                        )}
                    </div>

                    {/* KYB Identity */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            KYB Identity
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {org.website && (
                                <InfoRow icon={<Globe className="h-4 w-4" />} label="Website">
                                    <a href={org.website} target="_blank" rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline flex items-center gap-1 text-sm">
                                        {org.website} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                </InfoRow>
                            )}
                            {org.location && (
                                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location">
                                    <span className="text-sm text-gray-700">{org.location}</span>
                                </InfoRow>
                            )}
                            {meta?.registrationNumber && (
                                <InfoRow icon={<Hash className="h-4 w-4" />} label="Registration Number">
                                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                        {meta.registrationNumber}
                                    </span>
                                </InfoRow>
                            )}
                            {meta?.taxId && (
                                <InfoRow icon={<Receipt className="h-4 w-4" />} label="Tax ID">
                                    <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                        {meta.taxId}
                                    </span>
                                </InfoRow>
                            )}
                            {meta?.jurisdiction && (
                                <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Jurisdiction">
                                    <span className="text-sm text-gray-700 uppercase">{meta.jurisdiction}</span>
                                </InfoRow>
                            )}
                            {meta?.incorporationDate && (
                                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Incorporation Date">
                                    <span className="text-sm text-gray-700">
                                        {format(new Date(meta.incorporationDate), "MMMM d, yyyy")}
                                    </span>
                                </InfoRow>
                            )}
                            {org.linkedinUrl && (
                                <InfoRow icon={<Linkedin className="h-4 w-4" />} label="LinkedIn">
                                    <a href={org.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline flex items-center gap-1 text-sm">
                                        View Profile <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                </InfoRow>
                            )}
                            {org.twitterUrl && (
                                <InfoRow icon={<Twitter className="h-4 w-4" />} label="Twitter / X">
                                    <a href={org.twitterUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline flex items-center gap-1 text-sm">
                                        View Profile <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                    </a>
                                </InfoRow>
                            )}
                        </div>

                        {meta?.registeredAddress && (
                            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Registered Address">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{meta.registeredAddress}</p>
                            </InfoRow>
                        )}

                        {org.description && (
                            <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Description">
                                <p className="text-sm text-gray-700 leading-relaxed">{org.description}</p>
                            </InfoRow>
                        )}
                    </div>

                    {/* Documents */}
                    {org.orgDocuments.length > 0 ? (
                        <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Supporting Documents
                                <span className="ml-2 text-gray-400 font-normal normal-case text-[11px]">
                                    ({org.orgDocuments.length} uploaded)
                                </span>
                            </p>
                            <div className="flex flex-col gap-2">
                                {org.orgDocuments.map((doc) => {
                                    const Icon = docTypeIcon(doc.docType);
                                    return (
                                        <div key={doc.id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                            <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-800 font-medium truncate">{doc.title}</p>
                                                {doc.taxRefNumber && (
                                                    <p className="text-xs font-mono text-gray-400 mt-0.5 flex items-center gap-1">
                                                        <Tag className="h-3 w-3" /> {doc.taxRefNumber}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wide text-gray-400 flex-shrink-0">
                                                {doc.docType.replace(/_/g, " ")}
                                            </span>
                                            {doc.sourceUrl && (
                                                <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-indigo-500 hover:underline flex-shrink-0">
                                                    View <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* No documents notice */
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex gap-3 items-start">
                            <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">No documents uploaded</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                    The organization did not provide document proof. Verify manually via their website and LinkedIn.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Platform Stats */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Platform Activity</p>
                        <div className="grid grid-cols-3 gap-4">
                            <StatCard label="Members" value={org._count.members} />
                            <StatCard label="Events" value={org._count.events} />
                            <StatCard label="Participations" value={org._count.participations} />
                        </div>
                    </div>
                </div>

                {/* ── Right: action panel ─────────────────────────────────── */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4 sticky top-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Decision</p>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Review all signals carefully. Approving will mark this org as verified.
                        </p>

                        <div>
                            <label className="text-xs text-gray-500 mb-1.5 block">Review Note (optional)</label>
                            <Textarea
                                placeholder="Add a note about your decision..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="resize-none text-sm h-24"
                                disabled={!!loading}
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>
                        )}

                        <Button
                            id="approve-org-btn"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            disabled={!!loading}
                            onClick={() => handleAction("approve")}
                        >
                            {loading === "approve"
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
                                : <><CheckCircle2 className="h-4 w-4" /> Approve & Verify</>}
                        </Button>

                        <Button
                            id="reject-org-btn"
                            variant="outline"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 gap-2"
                            disabled={!!loading}
                            onClick={() => handleAction("reject")}
                        >
                            {loading === "reject"
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Rejecting…</>
                                : <><XCircle className="h-4 w-4" /> Reject</>}
                        </Button>

                        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                            The organization owner will be notified by email.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">{icon} {label}</p>
            {children}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        </div>
    );
}
