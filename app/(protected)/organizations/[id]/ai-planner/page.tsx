import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sparkles, Zap, Bot } from "lucide-react";
import { BrainstormChat } from "@/components/organizations/BrainstormChat";
import type { Metadata } from "next";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
    title: "AI Event Planner — CorpConnect",
    description: "Brainstorm and refine event ideas with your AI event strategist, then pitch them to your organization's admin.",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AIPlannerPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { id: organizationId } = await params;

    // Verify the user is a member of this org
    const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId },
        include: {
            organization: {
                select: { id: true, name: true, subscriptionPlan: true },
            },
        },
    });

    if (!membership) redirect(`/organizations/${organizationId}`);

    // Enterprise gate — only ENTERPRISE orgs can use the AI planner
    if (membership.organization.subscriptionPlan !== "ENTERPRISE") {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-6">
                    <Zap className="w-10 h-10 text-amber-500" />
                </div>
                <h1 className="text-2xl font-headline font-bold text-nx-on-surface mb-3">
                    Enterprise Feature
                </h1>
                <p className="text-sm text-nx-on-surface-variant max-w-md">
                    The AI Event Brainstorming Assistant is available exclusively to Enterprise-tier organizations.
                    Upgrade your plan to unlock AI-powered event planning.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Page Header ── */}
            <div className="shrink-0 px-6 py-5 border-b border-nx-outline-variant bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nx-primary-container/50 border border-nx-primary/20 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-nx-primary" />
                    </div>
                    <div>
                        <h1 className="text-base font-headline font-bold text-nx-on-surface flex items-center gap-2">
                            AI Event Brainstorming
                            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-nx-primary-container text-nx-primary border border-nx-primary/20">
                                Enterprise
                            </span>
                        </h1>
                        <p className="text-xs text-nx-on-surface-variant">
                            {membership.organization.name} · Brainstorm → Refine → Pitch to Admin
                        </p>
                    </div>
                </div>

                {/* How it works */}
                <div className="flex items-center gap-2 mt-4 text-[11px] text-nx-on-surface-variant">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nx-surface-container border border-nx-outline-variant">
                        <Sparkles className="w-3 h-3 text-nx-primary" />
                        1. Chat with AI
                    </span>
                    <span className="text-nx-outline-variant">→</span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nx-surface-container border border-nx-outline-variant">
                        📋 2. Generate Brief
                    </span>
                    <span className="text-nx-outline-variant">→</span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-nx-surface-container border border-nx-outline-variant">
                        🚀 3. Pitch to Admin
                    </span>
                </div>
            </div>

            {/* ── Chat interface ── */}
            <div className="flex-1 overflow-hidden">
                <BrainstormChat
                    userId={session.user.id}
                    organizationId={organizationId}
                />
            </div>
        </div>
    );
}
