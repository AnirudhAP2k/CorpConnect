/**
 * app/(protected)/billing/page.tsx
 *
 * Billing management page accessible from org settings.
 * Shows current plan, usage metrics, payment history, and upgrade CTAs.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PricingPlans } from "@/components/billing/PricingPlans";
import { getAiUsageStats } from "@/domain/ai";
import type { SubscriptionPlan, SubscriptionStatus, PaymentProvider } from "@prisma/client";
import "./billing.css";

export const metadata = {
    title: "Billing — CorpConnect",
    description: "Manage your organization's subscription plan and payments.",
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
    FREE: "#64748b",
    PRO: "#6366f1",
    ENTERPRISE: "#f59e0b",
};

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
    ACTIVE: "#22c55e",
    PAST_DUE: "#f97316",
    CANCELLED: "#ef4444",
    TRIALING: "#8b5cf6",
};

const PLAN_FEATURES: Record<SubscriptionPlan, { text: string; isNew?: boolean }[]> = {
    FREE: [
        { text: "Up to 3 active public events" },
        { text: "Max 50 attendees per event" },
        { text: "Basic org profile" },
        { text: "Org discovery & connection requests" },
    ],
    PRO: [
        { text: "Unlimited events" },
        { text: "AI matchmaking & semantic search" },
        { text: "Analytics dashboard" },
        { text: "Payment modes: PLATFORM & EXTERNAL" },
        { text: "Business messaging (1-to-1)" },
        { text: "2% platform fee" },
    ],
    ENTERPRISE: [
        { text: "Everything in PRO" },
        { text: "Group messaging", isNew: true },
        { text: "AI Event Brainstorming Assistant", isNew: true },
        { text: "Pitch-to-admin workflow", isNew: true },
        { text: "Post-event AI analytics reports", isNew: true },
        { text: "API access & webhooks" },
        { text: "1% platform fee" },
    ],
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
        redirect("/dashboard");
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
        <div className="billing-page">
            <div className="billing-container">

                {/* Header */}
                <div className="billing-header">
                    <div>
                        <h1 className="billing-title">Billing & Subscription</h1>
                        <p className="billing-subtitle">{org.name}</p>
                    </div>
                    {org.isVerified && (
                        <div className="verified-badge">
                            <span>✓ Verified</span>
                        </div>
                    )}
                </div>

                {/* Current Plan Card */}
                <div className="current-plan-card">
                    <div className="plan-status-row">
                        <div>
                            <span className="plan-tag" style={{ background: planColor }}>
                                {org.subscriptionPlan}
                            </span>
                            <span className="status-tag" style={{ color: statusColor }}>
                                • {org.subscriptionStatus}
                            </span>
                        </div>
                        {org.subscriptionExpiresAt && (
                            <span className="plan-expiry">
                                Renews {org.subscriptionExpiresAt.toLocaleDateString("en-IN")}
                            </span>
                        )}
                    </div>

                    <div className="plan-features-grid">
                        {PLAN_FEATURES[org.subscriptionPlan].map((f) => (
                            <div key={f.text} className="plan-feature-item">
                                <span className="feature-dot" style={{ background: planColor }} />
                                {f.text}
                                {f.isNew && (
                                    <span className="feature-new-badge">NEW</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {org.subscriptionPlan !== "FREE" && (
                        <form action="/api/billing/portal" method="POST">
                            <button type="submit" className="manage-billing-btn">
                                Manage Billing via Stripe →
                            </button>
                        </form>
                    )}
                </div>

                {/* Usage Metrics */}
                <div className="usage-metrics">
                    <div className="usage-metric">
                        <span className="metric-value">{org._count.events}</span>
                        <span className="metric-label">Total Events Hosted</span>
                    </div>
                    <div className="usage-metric">
                        <span className="metric-value">{org._count.members}</span>
                        <span className="metric-label">Org Members</span>
                    </div>
                    <div className="usage-metric">
                        <span className="metric-value">
                            ₹{(totalRevenue / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                        <span className="metric-label">Total Event Revenue</span>
                    </div>
                    <div className="usage-metric">
                        <span className="metric-value">{eventPayments.length}</span>
                        <span className="metric-label">Payments Received</span>
                    </div>
                </div>

                {/* AI Usage */}
                {org.subscriptionPlan !== "FREE" && (
                    <div className="ai-usage-card">
                        <div className="ai-usage-header">
                            <h3 className="ai-usage-title">⚡ AI Credits</h3>
                            <span className="ai-usage-plan" style={{ color: planColor }}>
                                {org.subscriptionPlan} Plan
                            </span>
                        </div>
                        <div className="ai-progress-bar">
                            <div
                                className="ai-progress-fill"
                                style={{
                                    width: `${aiUsagePercent}%`,
                                    background: aiUsagePercent >= 90
                                        ? "#ef4444"
                                        : aiUsagePercent >= 70
                                            ? "#f59e0b"
                                            : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                                }}
                            />
                        </div>
                        <div className="ai-usage-stats">
                            <span>{aiUsage.used.toLocaleString()} / {aiUsage.limit.toLocaleString()} credits used</span>
                            <span className="ai-usage-remaining">
                                {(aiUsage.limit - aiUsage.used).toLocaleString()} remaining
                            </span>
                        </div>
                    </div>
                )}

                {/* Upgrade Plans */}
                {(org.subscriptionPlan === "FREE" || org.subscriptionPlan === "PRO") && (
                    <div className="upgrade-section">
                        <h2 className="section-title">
                            {org.subscriptionPlan === "FREE" ? "Upgrade Your Plan" : "Upgrade to Enterprise"}
                        </h2>
                        <p className="section-subtitle">
                            {org.subscriptionPlan === "FREE"
                                ? "Unlock AI matchmaking, unlimited events, and paid event collection."
                                : "Unlock Group Messaging, AI Event Brainstorming, post-event analytics reports, and more."
                            }
                        </p>
                        <PricingPlans currentPlan={org.subscriptionPlan} />
                    </div>
                )}

                {/* Payment History */}
                {eventPayments.length > 0 && (
                    <div className="payment-history">
                        <h2 className="section-title">Event Payment History</h2>
                        <div className="payment-table-wrapper">
                            <table className="payment-table">
                                <thead>
                                    <tr>
                                        <th>Event</th>
                                        <th>Provider</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventPayments.map((p) => (
                                        <tr key={p.id}>
                                            <td>{p.event.title}</td>
                                            <td>
                                                <span className="provider-chip">
                                                    {p.provider === "STRIPE" ? "🌍 Stripe" : "🇮🇳 Razorpay"}
                                                </span>
                                            </td>
                                            <td>
                                                {p.currency.toUpperCase()}&nbsp;
                                                {(p.amount / 100).toFixed(2)}
                                            </td>
                                            <td>
                                                <span
                                                    className="status-chip"
                                                    style={{ color: p.status === "SUCCEEDED" ? "#22c55e" : "#ef4444" }}
                                                >
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td>{p.createdAt.toLocaleDateString("en-IN")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Subscription History */}
                {subscriptions.length > 0 && (
                    <div className="sub-history">
                        <h2 className="section-title">Subscription History</h2>
                        <div className="sub-list">
                            {subscriptions.map((s, i) => (
                                <div key={i} className="sub-item">
                                    <div className="sub-item-left">
                                        <span className="plan-tag" style={{ background: PLAN_COLORS[s.plan], fontSize: "12px" }}>
                                            {s.plan}
                                        </span>
                                        <span className="provider-chip">
                                            {s.provider === "STRIPE" ? "🌍 Stripe" : "🇮🇳 Razorpay"}
                                        </span>
                                    </div>
                                    <div className="sub-item-right">
                                        <span className="sub-period">
                                            {s.currentPeriodStart.toLocaleDateString("en-IN")} –{" "}
                                            {s.currentPeriodEnd.toLocaleDateString("en-IN")}
                                        </span>
                                        <span className="status-chip" style={{ color: STATUS_COLORS[s.status] }}>
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
