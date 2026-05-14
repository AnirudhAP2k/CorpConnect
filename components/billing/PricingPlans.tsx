"use client";

/**
 * components/billing/PricingPlans.tsx
 *
 * Three-column pricing card (FREE / PRO / ENTERPRISE) with monthly/yearly toggle.
 * Calls POST /api/billing/subscribe on CTA click.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Plan = "FREE" | "PRO" | "ENTERPRISE";
type Provider = "stripe" | "razorpay";

interface PlanConfig {
    name: Plan;
    price: { monthly: string; yearly: string };
    rupee: { monthly: string; yearly: string };
    description: string;
    features: string[];
    badge?: string;
    highlighted?: boolean;
}

const PLANS: PlanConfig[] = [
    {
        name: "FREE",
        price: { monthly: "$0", yearly: "$0" },
        rupee: { monthly: "₹0", yearly: "₹0" },
        description: "For small orgs getting started",
        features: [
            "Up to 3 active public events",
            "Max 50 attendees per event",
            "Basic event management",
            "Org profiles & discovery",
            "Community support",
        ],
    },
    {
        name: "PRO",
        price: { monthly: "$35", yearly: "$350" },
        rupee: { monthly: "₹2,999", yearly: "₹29,990" },
        description: "For growing B2B networks",
        features: [
            "Unlimited events & attendees",
            "AI matchmaking recommendations",
            "Org analytics dashboard",
            "PLATFORM & EXTERNAL payment modes",
            "Pre-event meeting scheduling",
            "Priority email support",
            "2% platform fee on payments",
        ],
        badge: "Most Popular",
        highlighted: true,
    },
    {
        name: "ENTERPRISE",
        price: { monthly: "$120", yearly: "$1,200" },
        rupee: { monthly: "₹9,999", yearly: "₹99,990" },
        description: "For large enterprises & consortiums",
        features: [
            "Everything in PRO",
            "Semantic search (pgvector)",
            "API access + webhooks",
            "Industry group creation",
            "Dedicated account manager",
            "1% platform fee on payments",
            "Custom integrations",
        ],
        badge: "Enterprise",
    },
];

interface PricingPlansProps {
    currentPlan?: Plan;
    onSelectPlan?: (plan: Plan, provider: Provider) => void;
}

export function PricingPlans({ currentPlan = "FREE", onSelectPlan }: PricingPlansProps) {
    const router = useRouter();
    const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
    const [provider, setProvider] = useState<Provider>("stripe");
    const [isPending, startTransition] = useTransition();
    const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);

    const handleSubscribe = (plan: Plan) => {
        if (plan === "FREE") return;
        if (onSelectPlan) {
            onSelectPlan(plan, provider);
            return;
        }

        setLoadingPlan(plan);
        startTransition(async () => {
            try {
                const res = await fetch("/api/billing/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ plan, provider }),
                });
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert(data.error ?? "Failed to start checkout");
                }
            } catch {
                alert("Something went wrong. Please try again.");
            } finally {
                setLoadingPlan(null);
            }
        });
    };

    const isINR = provider === "razorpay";

    return (
        <div className="pricing-plans">
            {/* Toggle */}
            <div className="pricing-controls">
                <div className="billing-toggle">
                    <button
                        className={`billing-btn ${billing === "monthly" ? "active" : ""}`}
                        onClick={() => setBilling("monthly")}
                    >
                        Monthly
                    </button>
                    <button
                        className={`billing-btn ${billing === "yearly" ? "active" : ""}`}
                        onClick={() => setBilling("yearly")}
                    >
                        Yearly
                        <span className="save-badge">Save 17%</span>
                    </button>
                </div>

                <div className="provider-toggle">
                    <span className="provider-label">Pay with:</span>
                    <button
                        className={`provider-btn ${provider === "stripe" ? "active" : ""}`}
                        onClick={() => setProvider("stripe")}
                    >
                        🌍 Stripe (USD)
                    </button>
                    <button
                        className={`provider-btn ${provider === "razorpay" ? "active" : ""}`}
                        onClick={() => setProvider("razorpay")}
                    >
                        🇮🇳 Razorpay (INR)
                    </button>
                </div>
            </div>

            {/* Cards */}
            <div className="pricing-grid">
                {PLANS.map((plan) => {
                    const isCurrent = plan.name === currentPlan;
                    const isPaid = plan.name !== "FREE";
                    const price = isINR ? plan.rupee[billing] : plan.price[billing];
                    const isLoading = loadingPlan === plan.name && isPending;

                    return (
                        <div
                            key={plan.name}
                            className={`pricing-card ${plan.highlighted ? "highlighted" : ""} ${isCurrent ? "current" : ""}`}
                        >
                            {plan.badge && (
                                <div className="plan-badge">{plan.badge}</div>
                            )}

                            <div className="plan-header">
                                <h3 className="plan-name">{plan.name}</h3>
                                <div className="plan-price">
                                    <span className="price-amount">{price}</span>
                                    {isPaid && (
                                        <span className="price-period">/{billing === "monthly" ? "mo" : "yr"}</span>
                                    )}
                                </div>
                                <p className="plan-description">{plan.description}</p>
                            </div>

                            <ul className="plan-features">
                                {plan.features.map((f) => (
                                    <li key={f} className="plan-feature">
                                        <span className="feature-check">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`plan-cta ${plan.highlighted ? "cta-primary" : "cta-secondary"} ${isCurrent ? "cta-current" : ""}`}
                                onClick={() => handleSubscribe(plan.name)}
                                disabled={isCurrent || plan.name === "FREE" || isLoading}
                            >
                                {isLoading
                                    ? "Redirecting…"
                                    : isCurrent
                                        ? "Current Plan"
                                        : plan.name === "FREE"
                                            ? "Free Forever"
                                            : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
