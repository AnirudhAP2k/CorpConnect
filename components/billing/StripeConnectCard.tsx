"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Landmark } from "lucide-react";

type StripeConnectCardProps = {
	connectedAccountId: string | null;
	chargesEnabled: boolean;
	payoutsEnabled: boolean;
	detailsSubmitted: boolean;
	readyForUsdPayouts: boolean;
	connectLanding?: "return" | "refresh" | null;
};

export function StripeConnectCard({
	connectedAccountId,
	chargesEnabled,
	payoutsEnabled,
	detailsSubmitted,
	readyForUsdPayouts,
	connectLanding = null,
}: StripeConnectCardProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		if (connectLanding !== "return" && connectLanding !== "refresh") return;

		startTransition(async () => {
			if (connectLanding === "refresh") {
				const res = await fetch("/api/billing/connect/onboard", { method: "POST" });
				const data = await res.json().catch(() => ({}));
				if (data.url) {
					window.location.href = data.url;
					return;
				}
				toast.error(data.error ?? "Could not resume Stripe onboarding");
				return;
			}

			const res = await fetch("/api/billing/connect/sync", { method: "POST" });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(data.error ?? "Could not refresh Stripe payout status");
				return;
			}
			toast.success(
				data.readyForUsdPayouts
					? "Stripe payouts are ready for USD tickets."
					: "Stripe onboarding saved. Finish any remaining requirements in Stripe.",
			);
			router.replace("/billing");
			router.refresh();
		});
	}, [connectLanding, router]);

	const startOnboarding = () => {
		startTransition(async () => {
			const res = await fetch("/api/billing/connect/onboard", { method: "POST" });
			const data = await res.json().catch(() => ({}));
			if (data.url) {
				window.location.href = data.url;
				return;
			}
			toast.error(data.error ?? "Could not start Stripe onboarding");
		});
	};

	const openDashboard = () => {
		startTransition(async () => {
			const res = await fetch("/api/billing/connect/dashboard", { method: "POST" });
			const data = await res.json().catch(() => ({}));
			if (data.url) {
				window.location.href = data.url;
				return;
			}
			toast.error(data.error ?? "Could not open Stripe Express dashboard");
		});
	};

	const statusLabel = readyForUsdPayouts
		? "Ready for USD ticket payouts"
		: detailsSubmitted
			? "Reviewing with Stripe"
			: connectedAccountId
				? "Onboarding incomplete"
				: "Not connected";

	return (
		<div className="bg-nx-surface-container-lowest rounded-2xl shadow-nx-card p-6 flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3 flex-wrap">
				<div>
					<h2 className="text-base font-semibold text-nx-on-surface flex items-center gap-2">
						<Landmark className="w-4 h-4 text-nx-on-tertiary-container" />
						USD event payouts
					</h2>
					<p className="text-sm text-nx-on-surface-variant mt-1">
						Connect a Stripe Express account so PLATFORM ticket revenue (minus
						the platform fee) is paid to your organization. Subscriptions stay
						on CorpConnect billing.
					</p>
				</div>
				<span
					className={`text-xs font-semibold ${
						readyForUsdPayouts ? "text-nx-success" : "text-nx-on-surface-variant"
					}`}
				>
					{statusLabel}
				</span>
			</div>

			{connectedAccountId && (
				<p className="text-xs text-nx-on-surface-variant">
					Charges {chargesEnabled ? "enabled" : "disabled"} · Payouts{" "}
					{payoutsEnabled ? "enabled" : "disabled"}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				{!readyForUsdPayouts && (
					<button
						type="button"
						onClick={startOnboarding}
						disabled={isPending}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-nx-on-primary bg-nx-primary hover:opacity-90 transition-opacity disabled:opacity-60"
					>
						{isPending
							? "Redirecting…"
							: connectedAccountId
								? "Continue Stripe onboarding"
								: "Connect with Stripe"}
					</button>
				)}
				{detailsSubmitted && (
					<button
						type="button"
						onClick={openDashboard}
						disabled={isPending}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-nx-on-tertiary-container border border-nx-outline-variant/40 hover:bg-nx-surface-container-high transition-colors disabled:opacity-60"
					>
						{isPending ? "Opening…" : "Open Stripe dashboard"}
					</button>
				)}
			</div>
		</div>
	);
}
