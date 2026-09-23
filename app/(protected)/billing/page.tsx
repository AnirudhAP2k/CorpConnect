/**
 * app/(protected)/billing/page.tsx
 *
 * Billing management page accessible from org settings.
 * Shows current plan, usage metrics, payment history, and upgrade CTAs.
 *
 * Rebuilt on Nexus Corporate nx-* design tokens — no separate billing.css.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { SubscriptionManage } from "@/components/billing/SubscriptionManage";
import { StripeConnectCard } from "@/components/billing/StripeConnectCard";
import { getAiUsageStats } from "@/domain/ai";
import { getBillingAccess, getBillingOverview } from "@/domain/billing";
import { isCurrencyLocked, isInrEligible } from "@/domain/billing/pricing";
import { formatMoney } from "@/lib/money";
import { PLAN_COLORS, STATUS_COLORS, PLAN_FEATURES } from "@/constants";
import { BadgeCheck, CreditCard, Calendar, Users, TrendingUp, Zap, Globe, IndianRupee } from "lucide-react";

export const metadata = {
    title: "Billing — CorpConnect",
    description: "Manage your organization's subscription plan and payments.",
};

export default async function BillingPage({
    searchParams,
}: {
    searchParams: Promise<{ connect?: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const access = await getBillingAccess(session.user.id);

    if (!access.allowed) {
        redirect(access.reason === "no-active-org" ? "/onboarding" : "/dashboard?flash=unauthorized");
    }

    const { orgId } = access;

    const [overview, aiUsage] = await Promise.all([
        getBillingOverview(orgId),
        getAiUsageStats(orgId),
    ]);

    if (!overview) redirect("/dashboard");

    const { org, eventPayments, subscriptions, totalRevenue } = overview;
    const query = await searchParams;
    const connectLanding =
        query.connect === "return" || query.connect === "refresh" ? query.connect : null;

    const planTone = PLAN_COLORS[org.subscriptionPlan];
    const statusClass = STATUS_COLORS[org.subscriptionStatus];
    const aiUsagePercent = aiUsage.limit > 0 ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : 0;
    const preferredCurrency = org.preferredCurrency === "INR" ? "INR" : "USD";
    const currencyLocked = isCurrencyLocked(org.subscriptionPlan, org.subscriptionStatus);
    const inrEligible = isInrEligible(org.meta?.jurisdiction);
    const activeSub = subscriptions.find((s) => s.status === "ACTIVE" || s.status === "PAST_DUE");

    return (
        <div className="min-h-screen bg-nx-surface-container-low py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-headline font-bold text-nx-on-surface tracking-tight">
                            Billing & Subscription
                        </h1>
                        <p className="text-sm text-nx-on-surface-variant mt-1">{org.name}</p>
                    </div>
                    {org.isVerified && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-nx-secondary-container text-nx-on-secondary-container">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Verified
                        </span>
                    )}
                </div>

                {/* Current Plan Card */}
                <div className="bg-nx-surface-container-lowest rounded-2xl shadow-nx-card p-6 flex flex-col gap-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${planTone.bg} ${planTone.on}`}
                            >
                                {org.subscriptionPlan}
                            </span>
                            <span className={`text-sm font-medium ${statusClass}`}>
                                • {org.subscriptionStatus}
                            </span>
                        </div>
                        {org.subscriptionExpiresAt && (
                            <span className="text-xs text-nx-on-surface-variant flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {org.subscriptionStatus === "TRIALING" ? "Trial ends" : "Renews"}{" "}
                                {org.subscriptionExpiresAt.toLocaleDateString("en-IN")}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PLAN_FEATURES[org.subscriptionPlan].map((f) => (
                            <div key={f.text} className="flex items-start gap-2 text-sm text-nx-on-surface-variant">
                                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${planTone.bg}`} />
                                <span>{f.text}</span>
                                {f.isNew && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold bg-nx-on-tertiary-container text-nx-tertiary-container uppercase tracking-wider shrink-0">
                                        New
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {org.subscriptionPlan !== "FREE" && activeSub && (
                        <SubscriptionManage provider={activeSub.provider} />
                    )}
                </div>

                <StripeConnectCard
                    connectedAccountId={org.stripeConnectedAccountId}
                    chargesEnabled={org.stripeChargesEnabled}
                    payoutsEnabled={org.stripePayoutsEnabled}
                    detailsSubmitted={org.stripeDetailsSubmitted}
                    readyForUsdPayouts={Boolean(
                        org.stripeConnectedAccountId && org.stripeChargesEnabled,
                    )}
                    connectLanding={connectLanding}
                />

                {/* Usage Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { value: org._count.events, label: "Events Hosted", icon: Calendar },
                        { value: org._count.members, label: "Org Members", icon: Users },
                        { value: formatMoney(totalRevenue, eventPayments[0]?.currency ?? preferredCurrency), label: "Total Revenue", icon: TrendingUp },
                        { value: eventPayments.length, label: "Payments", icon: CreditCard },
                    ].map((metric) => (
                        <div key={metric.label} className="bg-nx-surface-container-lowest rounded-xl shadow-nx-card p-5 flex flex-col items-center gap-1 text-center">
                            <metric.icon className="w-4 h-4 text-nx-on-surface-variant mb-1" />
                            <span className="text-2xl font-bold text-nx-on-tertiary-container">{metric.value}</span>
                            <span className="text-[0.7rem] text-nx-on-surface-variant uppercase tracking-widest font-medium">{metric.label}</span>
                        </div>
                    ))}
                </div>

                {/* AI Usage */}
                {org.subscriptionPlan !== "FREE" && (
                    <div className="bg-nx-surface-container-lowest rounded-2xl shadow-nx-card p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-nx-on-surface flex items-center gap-2">
                                <Zap className="w-4 h-4 text-nx-on-tertiary-container" />
                                AI Credits
                            </h3>
                            <span className={`text-xs font-bold uppercase tracking-wider ${planTone.text}`}>
                                {org.subscriptionPlan} Plan
                            </span>
                        </div>
                        <div className="w-full h-2 bg-nx-surface-container-high rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    aiUsagePercent >= 90
                                        ? "bg-nx-error"
                                        : aiUsagePercent >= 70
                                            ? "bg-nx-warning"
                                            : "bg-gradient-to-r from-nx-tertiary-container to-nx-on-tertiary-container"
                                }`}
                                style={{ width: `${aiUsagePercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-nx-on-surface-variant">
                            <span>{aiUsage.used.toLocaleString()} / {aiUsage.limit.toLocaleString()} credits used</span>
                            <span className="font-semibold text-nx-on-tertiary-container">
                                {(aiUsage.limit - aiUsage.used).toLocaleString()} remaining
                            </span>
                        </div>
                    </div>
                )}

                {/* Upgrade Plans */}
                {(org.subscriptionPlan === "FREE" || org.subscriptionPlan === "PRO") && (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-lg font-headline font-semibold text-nx-on-surface">
                                {org.subscriptionStatus === "TRIALING" || org.subscriptionPlan === "FREE"
                                    ? "Upgrade Your Plan"
                                    : "Upgrade to Enterprise"}
                            </h2>
                            <p className="text-sm text-nx-on-surface-variant mt-1">
                                {org.subscriptionStatus === "TRIALING"
                                    ? "Convert your trial to a paid plan. Yearly billing includes two months free."
                                    : org.subscriptionPlan === "FREE"
                                    ? "Unlock AI matchmaking, unlimited events, and paid event collection."
                                    : "Enterprise is billed through sales. Contact us for a custom agreement."}
                            </p>
                        </div>
                        <PricingPlans
                            currentPlan={org.subscriptionStatus === "TRIALING" ? "FREE" : org.subscriptionPlan}
                            preferredCurrency={preferredCurrency}
                            inrEligible={inrEligible}
                            currencyLocked={currencyLocked}
                        />
                    </div>
                )}

                {/* Payment History */}
                {eventPayments.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-headline font-semibold text-nx-on-surface">Event Payment History</h2>
                        <div className="bg-nx-surface-container-lowest rounded-2xl shadow-nx-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-nx-surface-container">
                                            <th className="text-left px-4 py-3 text-xs font-medium text-nx-on-surface-variant uppercase tracking-wider">Event</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-nx-on-surface-variant uppercase tracking-wider">Provider</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-nx-on-surface-variant uppercase tracking-wider">Amount</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-nx-on-surface-variant uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs font-medium text-nx-on-surface-variant uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-nx-outline-variant/20">
                                        {eventPayments.map((p) => (
                                            <tr key={p.id} className="hover:bg-nx-surface-container-low transition-colors">
                                                <td className="px-4 py-3 text-nx-on-surface">{p.event.title}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-nx-surface-container text-nx-on-surface-variant">
                                                        {p.provider === "STRIPE" ? <><Globe className="w-3 h-3" /> Stripe</> : <><IndianRupee className="w-3 h-3" /> Razorpay</>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-nx-on-surface font-medium">
                                                    {formatMoney(p.amount, p.currency)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-xs font-semibold ${p.status === "SUCCEEDED" ? "text-nx-success" : "text-nx-error"}`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-nx-on-surface-variant">{p.createdAt.toLocaleDateString("en-IN")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscription History */}
                {subscriptions.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-headline font-semibold text-nx-on-surface">Subscription History</h2>
                        <div className="flex flex-col gap-3">
                            {subscriptions.map((s, i) => (
                                <div key={i} className="bg-nx-surface-container-lowest rounded-xl shadow-nx-card px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider ${PLAN_COLORS[s.plan].bg} ${PLAN_COLORS[s.plan].on}`}
                                        >
                                            {s.plan}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-nx-surface-container text-nx-on-surface-variant">
                                            {s.provider === "STRIPE" ? <><Globe className="w-3 h-3" /> Stripe</> : <><IndianRupee className="w-3 h-3" /> Razorpay</>}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-nx-on-surface-variant">
                                            {s.currentPeriodStart.toLocaleDateString("en-IN")} – {s.currentPeriodEnd.toLocaleDateString("en-IN")}
                                        </span>
                                        <span className={`text-xs font-semibold ${STATUS_COLORS[s.status]}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
