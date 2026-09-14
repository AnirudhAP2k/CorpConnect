"use client";

/**
 * components/billing/ProviderPicker.tsx
 *
 * Full-screen fixed modal for selecting a payment provider (Stripe / Razorpay).
 * Calls /api/events/[id]/checkout and handles the redirect.
 */

import { useState, useTransition } from "react";
import { X, Loader2, CreditCard, LockKeyhole } from "lucide-react";

import { formatMajorAmount } from "@/lib/money";
import type { ProviderPickerProps } from "@/domain/billing/types";

const loadRazorpayScript = (): Promise<void> => {
	return new Promise((resolve, reject) => {
		if ((window as any).Razorpay) return resolve();
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
		document.head.appendChild(script);
	});
};

export function ProviderPicker({
	eventId,
	eventTitle,
	price,
	currency,
	onClose,
	onSuccess,
}: ProviderPickerProps) {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const gateway = currency.toUpperCase() === "INR" ? "razorpay" : "stripe";

	const pay = () => {
		setError(null);
		startTransition(async () => {
			try {
				const res = await fetch(`/api/events/${eventId}/checkout`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ provider: gateway }),
				});
				const data = await res.json();

				if (!res.ok) {
					setError(data.error ?? "Checkout failed. Please try again.");
					return;
				}

				if (data.mode === "free") {
					onSuccess?.();
					onClose();
					return;
				}

				if (data.mode === "external") {
					window.open(data.url, "_blank");
					onClose();
					return;
				}

				if (data.url) {
					// Stripe redirect
					window.location.href = data.url;
					return;
				}

				// Razorpay — load browser SDK from CDN then open inline checkout
				if (data.orderId && typeof window !== "undefined") {
					await loadRazorpayScript();
					const primaryChannels = getComputedStyle(document.documentElement)
						.getPropertyValue("--nx-primary")
						.trim();
					const rzp = new (window as any).Razorpay({
						key: data.keyId,
						amount: data.amount,
						currency: data.currency,
						name: "CorpConnect",
						description: data.eventTitle,
						order_id: data.orderId,
						callback_url: data.callbackUrl,
						prefill: data.prefill,
						theme: { color: `rgb(${primaryChannels})` },
					});
					rzp.open();
					onClose();
				}
			} catch (error: any) {
				console.error(error);
				setError(error.message || "Something went wrong. Please try again.");
			}
		});
	};

	return (
		// Fixed full-screen backdrop
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-nx-inverse-surface/60 backdrop-blur-sm p-4"
			onClick={onClose}
		>
			{/* Modal card */}
			<div
				className="relative w-full max-w-md rounded-2xl bg-nx-surface-container-lowest text-nx-on-surface shadow-2xl p-8 flex flex-col gap-5"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="provider-picker-title"
			>
				{/* Close button */}
				<button
					className="absolute top-4 right-4 text-nx-on-surface-variant hover:text-nx-on-surface transition-colors"
					onClick={onClose}
					aria-label="Close"
				>
					<X className="w-5 h-5" />
				</button>

				{/* Header */}
				<div className="flex flex-col items-center text-center gap-2">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nx-secondary-container text-nx-on-secondary-container">
						<CreditCard className="h-6 w-6" aria-hidden="true" />
					</div>
					<h2
						id="provider-picker-title"
						className="text-xl font-bold text-nx-on-surface"
					>
						Complete Your Registration
					</h2>
					<p className="text-sm text-nx-on-surface-variant">
						<span className="font-semibold text-nx-on-surface">
							{eventTitle}
						</span>
						{" — "}
						<span className="font-semibold text-nx-tertiary">
							{formatMajorAmount(price, currency)}
						</span>
					</p>
				</div>

				<p className="text-sm text-nx-on-surface-variant text-center">
					{gateway === "razorpay"
						? "Pay with Razorpay (UPI, cards, net banking)"
						: "Pay with Stripe (cards, Apple Pay)"}
				</p>

				<button
					className="flex items-center justify-center gap-2 rounded-xl border-2 border-nx-outline-variant/30 hover:border-nx-tertiary hover:bg-nx-tertiary-container p-4 transition-all disabled:opacity-50 font-semibold text-nx-on-surface"
					onClick={pay}
					disabled={isPending}
				>
					{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
					{isPending
						? "Preparing checkout…"
						: `Continue with ${gateway === "razorpay" ? "Razorpay" : "Stripe"}`}
				</button>

				{/* Error */}
				{error && (
					<p className="text-sm text-nx-on-error-container text-center bg-nx-error-container rounded-lg px-3 py-2">
						{error}
					</p>
				)}

				{/* Pending state */}
				{isPending && (
					<p className="text-sm text-nx-tertiary text-center animate-pulse">
						Preparing checkout…
					</p>
				)}

				{/* Security note */}
				<p className="text-xs text-nx-on-surface-variant text-center">
					🔒 Payments secured by Stripe / Razorpay. CorpConnect never stores
					card details.
				</p>
			</div>
		</div>
	);
}
