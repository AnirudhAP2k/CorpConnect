"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrgKybSchema } from "@/lib/validation";
import { type OrgKybValues } from "@/lib/types";
import {
    Form, FormControl, FormField, FormItem,
    FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OrgDocumentUploader, type UploadedDoc } from "@/components/shared/OrgDocumentUploader";
import { FormErrors } from "@/components/FormErrors";
import { FormSuccess } from "@/components/FormSuccess";
import axios from "axios";
import { Loader2, ShieldCheck, FileText, ArrowRight } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrgKybFormProps {
    orgId: string;
    initialMeta: Partial<OrgKybValues & { verificationStatus: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgKybForm({ orgId, initialMeta }: OrgKybFormProps) {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, start] = useTransition();
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
    const [docCount, setDocCount] = useState(0);

    const form = useForm<OrgKybValues>({
        resolver: zodResolver(OrgKybSchema),
        defaultValues: {
            registrationNumber: initialMeta.registrationNumber ?? "",
            jurisdiction: initialMeta.jurisdiction ?? "",
            taxId: initialMeta.taxId ?? "",
            incorporationDate: initialMeta.incorporationDate
                ? new Date(initialMeta.incorporationDate as any).toISOString().split("T")[0]
                : "",
            registeredAddress: initialMeta.registeredAddress ?? "",
        },
    });

    // Track persisted docs from the uploader
    const handleDocsChange = (docs: UploadedDoc[]) => {
        setUploadedDocs(docs);
        setDocCount(docs.length);
    };

    const onSubmit = async (values: OrgKybValues) => {
        setError("");
        setSuccess("");

        start(async () => {
            try {
                await axios.patch(`/api/organizations/${orgId}/meta`, values);
                setSuccess(
                    docCount > 0
                        ? `KYB information saved with ${docCount} document(s) uploaded. Your application is now under review.`
                        : "KYB information saved. Upload your documents to strengthen your verification."
                );
            } catch (err: any) {
                setError(err?.response?.data?.error || "Something went wrong. Please try again.");
            }
        });
    };

    const status = initialMeta.verificationStatus;

    return (
        <div className="space-y-8">
            {/* Status pill */}
            {status && !["PENDING", "AWAITING_DOCS"].includes(status) && (
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${status === "VERIFIED"
                    ? "bg-emerald-50 border-emerald-200"
                    : status === "IN_REVIEW"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-red-50 border-red-200"
                    }`}>
                    <ShieldCheck className={`h-5 w-5 flex-shrink-0 ${status === "VERIFIED" ? "text-emerald-600"
                        : status === "IN_REVIEW" ? "text-amber-600"
                            : "text-red-500"
                        }`} />
                    <div>
                        <p className="text-sm font-semibold text-gray-800">
                            Verification Status:{" "}
                            <span className={
                                status === "VERIFIED" ? "text-emerald-700"
                                    : status === "IN_REVIEW" ? "text-amber-700"
                                        : "text-red-600"
                            }>{status.replace("_", " ")}</span>
                        </p>
                        {status === "IN_REVIEW" && (
                            <p className="text-xs text-amber-600 mt-0.5">
                                Our team is reviewing your documents. You'll be notified once verified.
                            </p>
                        )}
                        {status === "REJECTED" && (
                            <p className="text-xs text-red-500 mt-0.5">
                                Your verification was rejected. Please update your information and resubmit.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* ── Section: Company Identity ─────────────────────────── */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-5">
                        <div>
                            <h2 className="text-base font-semibold text-gray-800">Company Identity</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Official details used to verify your organization's legitimacy.
                                This information is kept confidential.
                            </p>
                        </div>

                        {/* Row 1: Registration + Tax ID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="registrationNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Registration Number
                                            <span className="ml-1 text-gray-400 font-normal text-xs">(CIN / CRN / EIN)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. U12345MH2020PTC123456" {...field} disabled={isPending} className="font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="taxId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Tax ID
                                            <span className="ml-1 text-gray-400 font-normal text-xs">(GSTIN / VAT / EIN)</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 22AAAAA0000A1Z5" {...field} disabled={isPending} className="font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 2: Jurisdiction + Incorporation Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="jurisdiction"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country / Jurisdiction</FormLabel>
                                        <FormControl>
                                            <Input placeholder="IN, GB, US…" maxLength={2} {...field} disabled={isPending} className="uppercase font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField control={form.control} name="incorporationDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date of Incorporation</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 3: Registered Address */}
                        <FormField control={form.control} name="registeredAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Registered Office Address</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Full registered address including postal code"
                                            className="resize-none h-20"
                                            {...field}
                                            disabled={isPending}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* ── Section: Document Uploads ─────────────────────────── */}
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 space-y-4">
                        <div>
                            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                Supporting Documents
                            </h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Upload official documents to support your registration details.
                                Files are stored securely and used only for verification.
                            </p>
                        </div>
                        <OrgDocumentUploader
                            orgId={orgId}
                            onChange={handleDocsChange}
                            disabled={isPending}
                        />
                    </div>

                    {/* Feedback */}
                    {error && <FormErrors message={error} />}
                    {success && <FormSuccess message={success} />}

                    {/* Submit */}
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
                            Saving your information triggers an admin review. You'll be notified
                            by email once your organization is verified.
                        </p>
                        <Button
                            id="save-kyb-btn"
                            type="submit"
                            disabled={isPending}
                            className="gap-2 flex-shrink-0"
                        >
                            {isPending
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                                : <><ArrowRight className="h-4 w-4" /> Save & Submit</>
                            }
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
