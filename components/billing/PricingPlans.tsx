"use client";

/**
 * components/billing/PricingPlans.tsx
 *
 * Three-column pricing card (FREE / PRO / ENTERPRISE) with monthly/yearly toggle.
 * Calls POST /api/billing/subscribe on CTA click.
 *
 * Rebuilt on Nexus Corporate nx-* tokens — no billing.css dependency.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
                    toast.error(data.error ?? "Failed to start checkout");
                }
            } catch {
                toast.error("Something went wrong. Please try again.");
            } finally {
                setLoadingPlan(null);
            }
        });
    };

    const isINR = provider === "razorpay";

    return (
        <div className="flex flex-col gap-6">
            {/* Toggle */}
            <div className="flex items-center flex-wrap gap-3">
                <div className="inline-flex items-center bg-nx-surface-container rounded-full p-1">
                    <button
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            billing === "monthly"
                                ? "bg-nx-primary text-nx-on-primary shadow-nx-primary"
                                : "text-nx-on-surface-variant hover:text-nx-on-surface"
                        }`}
                        onClick={() => setBilling("monthly")}
                    >
                        Monthly
                    </button>
                    <button
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                            billing === "yearly"
                                ? "bg-nx-primary text-nx-on-primary shadow-nx-primary"
                                : "text-nx-on-surface-variant hover:text-nx-on-surface"
                        }`}
                        onClick={() => setBilling("yearly")}
                    >
                        Yearly
                        <span className="px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold bg-nx-on-tertiary-container text-white">
                            Save 17%
                        </span>
                    </button>
                </div>

                <div className="inline-flex items-center bg-nx-surface-container rounded-full p-1 gap-1">
                    <span className="text-xs text-nx-on-surface-variant px-2 font-medium">Pay with:</span>
                    <button
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            provider === "stripe"
                                ? "bg-nx-primary text-nx-on-primary"
                                : "text-nx-on-surface-variant hover:text-nx-on-surface"
                        }`}
                        onClick={() => setProvider("stripe")}
                    >
                        Stripe (USD)
                    </button>
                    <button
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            provider === "razorpay"
                                ? "bg-nx-primary text-nx-on-primary"
                                : "text-nx-on-surface-variant hover:text-nx-on-surface"
                        }`}
                        onClick={() => setProvider("razorpay")}
                    >
                        Razorpay (INR)
                    </button>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {PLANS.map((plan) => {
                    const isCurrent = plan.name === currentPlan;
                    const isPaid = plan.name !== "FREE";
                    const price = isINR ? plan.rupee[billing] : plan.price[billing];
                    const isLoading = loadingPlan === plan.name && isPending;

                    return (
                        <div
                            key={plan.name}
                            className={`relative bg-nx-surface-container-lowest rounded-2xl p-6 flex flex-col gap-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-nx-float ${
                                plan.highlighted
                                    ? "shadow-nx-float ring-1 ring-nx-on-tertiary-container/30"
                                    : "shadow-nx-card"
                            } ${isCurrent ? "opacity-75" : ""}`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-nx-cta-gradient text-white whitespace-nowrap">
                                    {plan.badge}
                                </div>
                            )}

                            <div className="flex flex-col gap-1">
                                <h3 className="text-sm font-bold text-nx-on-surface uppercase tracking-wider">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-nx-on-surface">{price}</span>
                                    {isPaid && (
                                        <span className="text-sm text-nx-on-surface-variant">/{billing === "monthly" ? "mo" : "yr"}</span>
                                    )}
                                </div>
                                <p className="text-xs text-nx-on-surface-variant">{plan.description}</p>
                            </div>

                            <ul className="flex flex-col gap-2.5 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-nx-on-surface-variant">
                                        <span className="text-nx-on-tertiary-container font-bold shrink-0 mt-0.5">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                    plan.highlighted
                                        ? "bg-nx-cta-gradient text-nx-on-primary hover:shadow-nx-primary"
                                        : "bg-nx-surface-container-high text-nx-on-surface-variant hover:bg-nx-surface-container-highest"
                                } ${isCurrent ? "opacity-50 cursor-default" : ""}`}
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
