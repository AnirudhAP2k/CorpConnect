/**
 * app/(protected)/billing/page.tsx
 *
 * Billing management page accessible from org settings.
 * Shows current plan, usage metrics, payment history, and upgrade CTAs.
 *
 * Rebuilt on Nexus Corporate nx-* design tokens — no separate billing.css.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { getAiUsageStats } from "@/domain/ai";
import { PLAN_COLORS, STATUS_COLORS, PLAN_FEATURES } from "@/constants";
import { BadgeCheck, CreditCard, Calendar, Users, TrendingUp, Zap, Globe, IndianRupee } from "lucide-react";

export const metadata = {
    title: "Billing — CorpConnect",
    description: "Manage your organization's subscription plan and payments.",
};

export default async function BillingPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) redirect("/onboarding");

    const orgId = user.activeOrganizationId;

    // Verify OWNER/ADMIN
    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: orgId } },
        select: { role: true },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        redirect("/dashboard?flash=unauthorized");
    }

    const [org, eventPayments, subscriptions] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                name: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
                isVerified: true,
                _count: { select: { events: true, members: true } },
            },
        }),

        // Recent event payments received for this org's events
        prisma.eventPayment.findMany({
            where: { event: { organizationId: orgId }, status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                amount: true,
                currency: true,
                provider: true,
                status: true,
                createdAt: true,
                event: { select: { title: true } },
            },
        }),

        // Subscription history
        prisma.orgSubscription.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                plan: true,
                provider: true,
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelledAt: true,
            },
        }),
    ]);

    if (!org) redirect("/dashboard");

    const [totalRevenue, aiUsage] = await Promise.all([
        Promise.resolve(eventPayments.reduce((sum, p) => sum + p.amount, 0)),
        getAiUsageStats(orgId),
    ]);
    const planColor = PLAN_COLORS[org.subscriptionPlan];
    const statusColor = STATUS_COLORS[org.subscriptionStatus];
    const aiUsagePercent = aiUsage.limit > 0 ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100)) : 0;

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
                                className="px-3 py-1 rounded-full text-xs font-bold text-white tracking-wider uppercase"
                                style={{ background: planColor }}
                            >
                                {org.subscriptionPlan}
                            </span>
                            <span className="text-sm font-medium" style={{ color: statusColor }}>
                                • {org.subscriptionStatus}
                            </span>
                        </div>
                        {org.subscriptionExpiresAt && (
                            <span className="text-xs text-nx-on-surface-variant flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Renews {org.subscriptionExpiresAt.toLocaleDateString("en-IN")}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PLAN_FEATURES[org.subscriptionPlan].map((f) => (
                            <div key={f.text} className="flex items-start gap-2 text-sm text-nx-on-surface-variant">
                                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: planColor }} />
                                <span>{f.text}</span>
                                {f.isNew && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold bg-nx-on-tertiary-container text-white uppercase tracking-wider shrink-0">
                                        New
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {org.subscriptionPlan !== "FREE" && (
                        <form action="/api/billing/portal" method="POST">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-nx-on-tertiary-container border border-nx-outline-variant/40 hover:bg-nx-surface-container-high transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                Manage Billing via Stripe
                            </button>
                        </form>
                    )}
                </div>

                {/* Usage Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { value: org._count.events, label: "Events Hosted", icon: Calendar },
                        { value: org._count.members, label: "Org Members", icon: Users },
                        { value: `₹${(totalRevenue / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, label: "Total Revenue", icon: TrendingUp },
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
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: planColor }}>
                                {org.subscriptionPlan} Plan
                            </span>
                        </div>
                        <div className="w-full h-2 bg-nx-surface-container-high rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${aiUsagePercent}%`,
                                    background: aiUsagePercent >= 90
                                        ? "rgb(var(--nx-error))"
                                        : aiUsagePercent >= 70
                                            ? "rgb(var(--nx-warning))"
                                            : "linear-gradient(90deg, rgb(var(--nx-tertiary-container)), rgb(var(--nx-on-tertiary-container)))",
                                }}
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
                                {org.subscriptionPlan === "FREE" ? "Upgrade Your Plan" : "Upgrade to Enterprise"}
                            </h2>
                            <p className="text-sm text-nx-on-surface-variant mt-1">
                                {org.subscriptionPlan === "FREE"
                                    ? "Unlock AI matchmaking, unlimited events, and paid event collection."
                                    : "Unlock Group Messaging, AI Event Brainstorming, post-event analytics reports, and more."
                                }
                            </p>
                        </div>
                        <PricingPlans currentPlan={org.subscriptionPlan} />
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
                                                    {p.currency.toUpperCase()}&nbsp;{(p.amount / 100).toFixed(2)}
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
                                            className="px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold text-white uppercase tracking-wider"
                                            style={{ background: PLAN_COLORS[s.plan] }}
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
                                        <span className="text-xs font-semibold" style={{ color: STATUS_COLORS[s.status] }}>
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
