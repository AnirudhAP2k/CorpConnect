import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { requireEnterprise } from "@/lib/enterprise";
import { getUserOrgMembership } from "@/domain/organizations";
import { getPitchesByOrg, getPitchesByMember } from "@/domain/pitches";
import { MemberPitchCard } from "@/components/dashboard/MemberPitchCard";
import { AdminPitchReview } from "@/components/dashboard/AdminPitchReview";
import { FileText, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Event Pitches — CorpConnect",
    description: "Manage and review AI-generated event pitches for your organization.",
};

export default async function OrganizationPitchesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { id: organizationId } = await params;
    const userId = session.user.id;

    // Verify membership
    const membership = await getUserOrgMembership(userId, organizationId);

    if (!membership) redirect(`/organizations/${organizationId}`);

    // Enterprise gate
    await requireEnterprise(organizationId, { redirectTo: `/organizations/${organizationId}` });

    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    // Load member's own pitches and (if admin) all org pitches
    const myPitches = await getPitchesByMember(userId, organizationId);
    const orgPitches = isAdmin ? await getPitchesByOrg(organizationId) : [];

    return (
        <div className="min-h-screen bg-gray-50/50 py-8">
            <div className="wrapper max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-nx-outline-variant shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-nx-primary-container/50 border border-nx-primary/20 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-nx-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-nx-on-surface flex items-center gap-2">
                                Event Pitches
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-nx-primary-container text-nx-primary border border-nx-primary/20">
                                    {membership.organization.name}
                                </span>
                            </h1>
                            <p className="text-xs text-nx-on-surface-variant mt-0.5">
                                AI-brainstormed event pitches submitted for review and approval
                            </p>
                        </div>
                    </div>

                    <Link href={`/organizations/${organizationId}/ai-planner`}>
                        <Button className="gap-2 shadow-sm">
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            Brainstorm New Pitch
                        </Button>
                    </Link>
                </div>

                {/* Admin Review Section */}
                {isAdmin && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-nx-on-surface flex items-center gap-2">
                                All Organization Pitches
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                    {orgPitches.length}
                                </span>
                            </h2>
                            <p className="text-xs text-nx-on-surface-variant">Admin Review Console</p>
                        </div>

                        {orgPitches.length > 0 ? (
                            <div className="grid gap-4">
                                {orgPitches.map((pitch) => (
                                    <AdminPitchReview
                                        key={pitch.id}
                                        pitch={pitch}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-2xl border border-nx-outline-variant">
                                <FileText className="w-10 h-10 text-nx-on-surface-variant/40 mx-auto mb-2" />
                                <p className="text-sm text-nx-on-surface-variant font-medium">No organization pitches submitted yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Member Personal Pitches Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-nx-on-surface flex items-center gap-2">
                            My Pitches
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nx-surface-container-high text-nx-on-surface-variant">
                                {myPitches.length}
                            </span>
                        </h2>
                    </div>

                    {myPitches.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            {myPitches.map((pitch) => (
                                <MemberPitchCard
                                    key={pitch.id}
                                    pitch={pitch}
                                    organizationId={organizationId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-2xl border border-nx-outline-variant space-y-3">
                            <Sparkles className="w-10 h-10 text-nx-primary/40 mx-auto" />
                            <div>
                                <h3 className="text-sm font-semibold text-nx-on-surface">No pitches created yet</h3>
                                <p className="text-xs text-nx-on-surface-variant mt-1">
                                    Use the AI Event Brainstorming Assistant to develop and pitch new event ideas.
                                </p>
                            </div>
                            <Link href={`/organizations/${organizationId}/ai-planner`} className="inline-block pt-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Plus className="w-4 h-4" /> Start AI Brainstorming
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
