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
		bg: "bg-nx-warning-container/45 border-nx-warning/30",
		icon: "text-nx-warning",
		text: "text-nx-on-warning-container",
		sub: "text-nx-on-warning-container/80",
		badge: "bg-nx-warning-container text-nx-on-warning-container",
		title: (name: string) => `Complete verification for ${name}`,
		body: "Your organization passed initial safety checks! Upload required KYB documents to host events and use matchmaking.",
		cta: "Complete Verification",
	},
	PENDING: {
		bg: "bg-nx-surface-container-low border-nx-outline-variant",
		icon: "text-nx-on-surface-variant",
		text: "text-nx-on-surface",
		sub: "text-nx-on-surface-variant",
		badge: "bg-nx-surface-container-high text-nx-on-surface-variant",
		title: (name: string) => `Complete verification for ${name}`,
		body: "Your organization is pending verification. Please wait for our system to review the first phase of verification. We will notify you once it is completed.",
		cta: "Check Status",
	},
	IN_REVIEW: {
		bg: "bg-nx-tertiary-container/30 border-nx-tertiary/30",
		icon: "text-nx-tertiary",
		text: "text-nx-on-tertiary-container",
		sub: "text-nx-on-tertiary-container/80",
		badge: "bg-nx-tertiary-container text-nx-on-tertiary-container",
		title: (name: string) => `${name} is under review`,
		body: "Your KYB documents are being reviewed by our team. This usually takes 1–2 business days. Core features are locked until manual approval.",
		cta: "View Status",
	},
	REJECTED: {
		bg: "bg-nx-error-container/45 border-nx-error/30",
		icon: "text-nx-error",
		text: "text-nx-on-error-container",
		sub: "text-nx-on-error-container/80",
		badge: "bg-nx-error-container text-nx-on-error-container",
		title: (name: string) => `${name} verification was rejected`,
		body: "Your verification was rejected. Please review the admin notes and resubmit with updated information and documents.",
		cta: "Resubmit Documents",
	},
	VERIFIED: null, // Don't render
};

export function VerificationReminderBanner({
	orgId,
	orgName,
	status,
}: VerificationReminderBannerProps) {
	const [dismissed, setDismissed] = useState(false);
	const cfg = CONFIG[status];

	if (!cfg || dismissed) return null;

	return (
		<div
			className={`flex flex-col items-start gap-4 rounded-xl border p-4 font-body sm:flex-row ${cfg.bg}`}
		>
			{/* Icon */}
			<ShieldAlert className={`h-5 w-5 flex-shrink-0 mt-0.5 ${cfg.icon}`} />

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap mb-1">
					<p className={`font-headline text-sm font-semibold ${cfg.text}`}>
						{cfg.title(orgName)}
					</p>
					<span
						className={`rounded-full px-2 py-0.5 font-label text-[10px] font-medium ${cfg.badge}`}
					>
						{status.replace("_", " ")}
					</span>
				</div>
				<p className={`text-xs ${cfg.sub} leading-relaxed`}>{cfg.body}</p>
			</div>

			{/* CTA */}
			<div className="flex w-full items-center gap-2 sm:w-auto sm:flex-shrink-0">
				<Link href={`/organizations/${orgId}/complete-verification`}>
					<button
						id={`verify-banner-cta-${orgId}`}
						className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-label text-xs font-semibold transition-opacity hover:opacity-90
                            ${
															status === "REJECTED"
																? "border-nx-error bg-nx-error text-nx-on-error"
																: status === "IN_REVIEW"
																	? "border-nx-tertiary bg-nx-tertiary text-nx-on-tertiary"
																	: "border-nx-warning bg-nx-warning text-nx-on-warning"
														}`}
					>
						{cfg.cta}
						<ArrowRight className="h-3 w-3" />
					</button>
				</Link>
				{status !== "IN_REVIEW" && (
					<button
						onClick={() => setDismissed(true)}
						className="rounded-xl p-1 text-nx-on-surface-variant/60 transition-colors hover:bg-nx-surface-container-high hover:text-nx-on-surface"
						title="Dismiss"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
