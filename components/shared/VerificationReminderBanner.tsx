"use client";

import Link from "next/link";
import { ShieldAlert, ArrowRight, X } from "lucide-react";
import { useState } from "react";

interface VerificationReminderBannerProps {
    orgId: string;
    orgName: string;
    /** Current meta status */
    status: "PENDING" | "AWAITING_DOCS" | "IN_REVIEW" | "REJECTED" | "VERIFIED";
}

const CONFIG = {
    AWAITING_DOCS: {
        bg: "bg-amber-50 border-amber-200",
        icon: "text-amber-500",
        text: "text-amber-900",
        sub: "text-amber-700",
        badge: "bg-amber-100 text-amber-800",
        title: (name: string) => `Complete verification for ${name}`,
        body: "Your organization passed initial safety checks! Upload required KYB documents to host events and use matchmaking.",
        cta: "Complete Verification",
    },
    PENDING: null, // Don't show banner while background L1 job is running
    IN_REVIEW: {
        bg: "bg-blue-50 border-blue-200",
        icon: "text-blue-500",
        text: "text-blue-900",
        sub: "text-blue-700",
        badge: "bg-blue-100 text-blue-800",
        title: (name: string) => `${name} is under review`,
        body: "Your KYB documents are being reviewed by our team. This usually takes 1–2 business days. Core features are locked until manual approval.",
        cta: "View Status",
    },
    REJECTED: {
        bg: "bg-red-50 border-red-200",
        icon: "text-red-500",
        text: "text-red-900",
        sub: "text-red-700",
        badge: "bg-red-100 text-red-800",
        title: (name: string) => `${name} verification was rejected`,
        body: "Your verification was rejected. Please review the admin notes and resubmit with updated information and documents.",
        cta: "Resubmit Documents",
    },
    VERIFIED: null, // Don't render
};

export function VerificationReminderBanner({ orgId, orgName, status }: VerificationReminderBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    const cfg = CONFIG[status];

    if (!cfg || dismissed) return null;

    return (
        <div className={`rounded-2xl border ${cfg.bg} p-4 flex items-start gap-4`}>
            {/* Icon */}
            <ShieldAlert className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.icon}`} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-sm font-semibold ${cfg.text}`}>
                        {cfg.title(orgName)}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {status.replace("_", " ")}
                    </span>
                </div>
                <p className={`text-xs ${cfg.sub} leading-relaxed`}>{cfg.body}</p>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/organizations/${orgId}/complete-verification`}>
                    <button
                        id={`verify-banner-cta-${orgId}`}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                            ${status === "REJECTED"
                                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                                : status === "IN_REVIEW"
                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                    : "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                            }`}
                    >
                        {cfg.cta}
                        <ArrowRight className="h-3 w-3" />
                    </button>
                </Link>
                {status !== "IN_REVIEW" && (
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Dismiss"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
