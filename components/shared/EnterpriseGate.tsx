"use client";

/**
 * components/shared/EnterpriseGate.tsx
 *
 * Phase 15 — Enterprise Vertical Hardening
 *
 * Client component that wraps any enterprise-only UI section.
 * Renders children when the org is on an Enterprise plan, otherwise
 * shows a stylish paywall overlay with upgrade CTA.
 *
 * Props:
 *   isEnterprise  — boolean resolved server-side and passed as a prop
 *                   (avoids extra client-side fetching)
 *   feature       — short human-readable feature name shown in the paywall
 *   children      — the enterprise-only content to protect
 *   blur          — if true, blurs content underneath instead of hiding it (default: false)
 *   className     — optional wrapper className
 *
 * Usage (in a Server Component):
 *
 *   import { isEnterpriseOrg } from "@/lib/enterprise";
 *   import { EnterpriseGate } from "@/components/shared/EnterpriseGate";
 *
 *   const enterprise = await isEnterpriseOrg(org.id);
 *
 *   return (
 *     <EnterpriseGate isEnterprise={enterprise} feature="AI Event Planner">
 *       <AIPlannerPage />
 *     </EnterpriseGate>
 *   );
 */

import Link from "next/link";
import { Sparkles, Lock, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnterpriseGateProps {
    /** Resolved server-side — true if the org has an active Enterprise plan */
    isEnterprise: boolean;
    /** Short feature name shown in the paywall header */
    feature?: string;
    /** If true, blurs and overlays content instead of replacing it */
    blur?: boolean;
    /** Additional className for the root wrapper */
    className?: string;
    /** The enterprise-only content to protect. Optional when used as standalone paywall. */
    children?: React.ReactNode;
    /** Optional upgrade URL override (default: "/pricing") */
    upgradeHref?: string;
}

// ─── Paywall UI ───────────────────────────────────────────────────────────────

function EnterprisePaywall({
    feature = "this feature",
    upgradeHref = "/pricing",
}: {
    feature?: string;
    upgradeHref?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[320px] rounded-2xl border-2 border-dashed border-nx-primary/25 bg-gradient-to-br from-nx-primary-container/20 via-white to-purple-50/40 p-10 text-center">
            {/* Icon */}
            <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nx-primary to-purple-600 flex items-center justify-center shadow-lg shadow-nx-primary/25">
                    <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                    <Lock className="w-3 h-3 text-amber-900" />
                </div>
            </div>

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-nx-primary/10 border border-nx-primary/20 text-xs font-bold text-nx-primary mb-4">
                <Zap className="w-3 h-3 fill-current" />
                Enterprise Only
            </span>

            {/* Heading */}
            <h3 className="text-xl font-headline font-bold text-nx-on-surface mb-2">
                Unlock {feature}
            </h3>

            {/* Body */}
            <p className="text-sm text-nx-on-surface-variant max-w-sm leading-relaxed mb-6">
                {feature} is available exclusively to organizations on the{" "}
                <strong className="text-nx-primary">Enterprise</strong> plan. Upgrade to access
                advanced AI tools, group messaging, post-event analytics, and more.
            </p>

            {/* CTA */}
            <Link
                href={upgradeHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nx-primary text-white text-sm font-semibold hover:bg-nx-primary/90 transition-colors shadow-md shadow-nx-primary/25"
            >
                View Enterprise Plans
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}

// ─── Blur Overlay Variant ─────────────────────────────────────────────────────

function BlurOverlay({
    feature,
    upgradeHref,
    children,
    className,
}: {
    feature?: string;
    upgradeHref?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("relative", className)}>
            {/* Blurred content underneath */}
            <div className="pointer-events-none select-none blur-sm opacity-40">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-[2px]">
                <div className="flex flex-col items-center text-center px-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nx-primary to-purple-600 flex items-center justify-center shadow-lg mb-3">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-nx-on-surface mb-1">
                        Enterprise Feature
                    </p>
                    <p className="text-xs text-nx-on-surface-variant mb-3 max-w-[200px]">
                        Upgrade to access {feature ?? "this feature"}.
                    </p>
                    <Link
                        href={upgradeHref ?? "/pricing"}
                        className="text-xs font-semibold text-nx-primary underline underline-offset-2"
                    >
                        See Enterprise Plans →
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnterpriseGate({
    isEnterprise,
    feature,
    blur = false,
    className,
    children,
    upgradeHref,
}: EnterpriseGateProps) {
    // Pass-through when org has Enterprise plan
    if (isEnterprise) {
        return <>{children ?? null}</>;
    }

    // Blur variant — shows content teaser underneath
    if (blur) {
        return (
            <BlurOverlay feature={feature} upgradeHref={upgradeHref} className={className}>
                {children}
            </BlurOverlay>
        );
    }

    // Default — full paywall replaces content
    return (
        <div className={className}>
            <EnterprisePaywall feature={feature} upgradeHref={upgradeHref} />
        </div>
    );
}

export default EnterpriseGate;
