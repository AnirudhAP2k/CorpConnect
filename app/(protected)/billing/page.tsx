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
import type { SubscriptionPlan, SubscriptionStatus, PaymentProvider } from "@prisma/client";

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

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
    FREE: ["Up to 3 active public events", "Max 50 attendees/event", "Basic org profile"],
    PRO: ["Unlimited events", "AI matchmaking", "Analytics dashboard", "Payment modes: PLATFORM & EXTERNAL", "2% platform fee"],
    ENTERPRISE: ["Everything in PRO", "Semantic search", "API access", "Webhooks", "1% platform fee"],
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

    const totalRevenue = eventPayments.reduce((sum, p) => sum + p.amount, 0);
    const planColor = PLAN_COLORS[org.subscriptionPlan];
    const statusColor = STATUS_COLORS[org.subscriptionStatus];

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
                            <div key={f} className="plan-feature-item">
                                <span className="feature-dot" style={{ background: planColor }} />
                                {f}
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

                {/* Upgrade Plans */}
                {org.subscriptionPlan === "FREE" && (
                    <div className="upgrade-section">
                        <h2 className="section-title">Upgrade Your Plan</h2>
                        <p className="section-subtitle">
                            Unlock AI matchmaking, unlimited events, and paid event collection.
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

            <style>{`
                .billing-page {
                    min-height: 100vh;
                    background: #0f172a;
                    padding: 2rem 1rem;
                    color: #f8fafc;
                    font-family: 'Inter', sans-serif;
                }
                .billing-container {
                    max-width: 900px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .billing-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .billing-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .billing-subtitle { color: #94a3b8; margin-top: 0.25rem; }
                .verified-badge {
                    background: linear-gradient(135deg, #22c55e20, #16a34a20);
                    border: 1px solid #22c55e40;
                    color: #22c55e;
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    font-size: 0.875rem;
                    font-weight: 600;
                }
                .current-plan-card {
                    background: linear-gradient(135deg, #1e293b, #1a1f2e);
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .plan-status-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .plan-tag {
                    color: #fff;
                    padding: 0.25rem 0.75rem;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    letter-spacing: 1px;
                }
                .status-tag {
                    margin-left: 0.75rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                .plan-expiry { color: #64748b; font-size: 0.8rem; }
                .plan-features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 0.5rem;
                }
                .plan-feature-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #cbd5e1;
                }
                .feature-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    flex-shrink: 0;
                }
                .manage-billing-btn {
                    background: transparent;
                    border: 1px solid #4f46e5;
                    color: #818cf8;
                    padding: 0.5rem 1.25rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    width: fit-content;
                }
                .manage-billing-btn:hover {
                    background: #4f46e520;
                    color: #a5b4fc;
                }
                .usage-metrics {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 1rem;
                }
                .usage-metric {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    text-align: center;
                }
                .metric-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #6366f1;
                }
                .metric-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .upgrade-section, .payment-history, .sub-history {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .section-title {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #e2e8f0;
                }
                .section-subtitle { color: #64748b; font-size: 0.9rem; }
                .payment-table-wrapper { overflow-x: auto; }
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                .payment-table th, .payment-table td {
                    padding: 0.75rem 1rem;
                    text-align: left;
                    border-bottom: 1px solid #1e293b;
                }
                .payment-table th { color: #64748b; font-weight: 500; }
                .payment-table td { color: #cbd5e1; }
                .payment-table tr:hover td { background: #1e293b20; }
                .provider-chip {
                    background: #1e293b;
                    border: 1px solid #334155;
                    padding: 0.2rem 0.5rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                }
                .status-chip { font-size: 0.75rem; font-weight: 600; }
                .sub-list { display: flex; flex-direction: column; gap: 0.75rem; }
                .sub-item {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 10px;
                    padding: 0.875rem 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .sub-item-left { display: flex; align-items: center; gap: 0.5rem; }
                .sub-item-right { display: flex; align-items: center; gap: 0.75rem; }
                .sub-period { font-size: 0.8rem; color: #64748b; }

                /* PricingPlans embedded styles */
                .pricing-plans { display: flex; flex-direction: column; gap: 1.5rem; }
                .pricing-controls {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .billing-toggle, .provider-toggle {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: #1e293b;
                    padding: 0.25rem;
                    border-radius: 9999px;
                    border: 1px solid #334155;
                }
                .provider-label { color: #64748b; font-size: 0.8rem; padding-left: 0.5rem; }
                .billing-btn, .provider-btn {
                    padding: 0.4rem 1rem;
                    border-radius: 9999px;
                    border: none;
                    background: transparent;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                }
                .billing-btn.active, .provider-btn.active {
                    background: #6366f1;
                    color: #fff;
                }
                .save-badge {
                    background: #22c55e;
                    color: #fff;
                    font-size: 0.65rem;
                    padding: 0.1rem 0.4rem;
                    border-radius: 9999px;
                    font-weight: 700;
                }
                .pricing-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1.25rem;
                }
                .pricing-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    position: relative;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .pricing-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px #6366f120;
                }
                .pricing-card.highlighted {
                    border-color: #6366f1;
                    background: linear-gradient(135deg, #1e1f3a, #1e293b);
                }
                .pricing-card.current { opacity: 0.75; }
                .plan-badge {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff;
                    padding: 0.2rem 0.8rem;
                    border-radius: 9999px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                }
                .plan-header { display: flex; flex-direction: column; gap: 0.25rem; }
                .plan-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #e2e8f0;
                    letter-spacing: 1px;
                }
                .plan-price {
                    display: flex;
                    align-items: baseline;
                    gap: 0.25rem;
                }
                .price-amount { font-size: 2rem; font-weight: 700; color: #f8fafc; }
                .price-period { color: #64748b; font-size: 0.85rem; }
                .plan-description { color: #64748b; font-size: 0.85rem; }
                .plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
                .plan-feature { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.85rem; color: #94a3b8; }
                .feature-check { color: #22c55e; font-weight: 700; flex-shrink: 0; }
                .plan-cta {
                    padding: 0.75rem;
                    border-radius: 10px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    width: 100%;
                }
                .cta-primary {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: #fff;
                }
                .cta-primary:hover:not(:disabled) {
                    background: linear-gradient(135deg, #4f46e5, #7c3aed);
                }
                .cta-secondary {
                    background: #1e293b;
                    border: 1px solid #334155;
                    color: #94a3b8;
                }
                .cta-secondary:hover:not(:disabled) {
                    border-color: #6366f1;
                    color: #818cf8;
                }
                .cta-current {
                    opacity: 0.5;
                    cursor: default;
                }
                .plan-cta:disabled { cursor: not-allowed; }
            `}</style>
        </div>
    );
}
