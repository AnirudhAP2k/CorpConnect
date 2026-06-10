import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isEnterpriseOrg } from "@/lib/enterprise";
import { EnterpriseGate } from "@/components/shared/EnterpriseGate";
import { format } from "date-fns";
import { BarChart3, Users, Clock, Eye, Sparkles, TrendingUp, TrendingDown, Lightbulb, Star } from "lucide-react";
import type { Metadata } from "next";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const event = await prisma.events.findUnique({
        where: { id },
        select: { title: true },
    });
    return {
        title: event ? `Analytics Report — ${event.title}` : "Event Report",
        description: "Post-event performance analytics and AI executive summary.",
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number): string {
    return `${Math.round(n * 100)}%`;
}

function stars(rating: number | null): string {
    if (rating === null) return "N/A";
    return rating.toFixed(1);
}

function sentimentColor(score: number | null): string {
    if (score === null) return "bg-slate-400";
    if (score >= 0.3) return "bg-emerald-500";
    if (score <= -0.3) return "bg-red-500";
    return "bg-amber-400";
}

function sentimentLabel(score: number | null): string {
    if (score === null) return "No data";
    if (score >= 0.3) return "Positive";
    if (score <= -0.3) return "Negative";
    return "Neutral";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventReportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { id: eventId } = await params;

    // Fetch event with org and report
    const event = await prisma.events.findUnique({
        where: { id: eventId },
        include: {
            organization: {
                select: { id: true, name: true },
            },
            report: true,
        },
    });

    if (!event || !event.organization?.id) notFound();

    // Auth: must be a member of the hosting org
    const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: event.organization.id },
        select: { role: true },
    });

    if (!membership) redirect(`/events/${eventId}`);

    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);
    const org = event.organization!;
    const isEnterprise = await isEnterpriseOrg(org.id);

    // Non-enterprise orgs see the EnterpriseGate paywall
    if (!isEnterprise) {
        return (
            <EnterpriseGate isEnterprise={false} feature="Post-Event Analytics" />
        );
    }

    // Report not yet generated
    if (!event.report) {
        const isFinished = event.endDateTime && event.endDateTime < new Date();
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
                <div className="w-20 h-20 rounded-3xl bg-nx-primary-container/40 border-2 border-nx-primary/20 flex items-center justify-center mb-6">
                    <BarChart3 className="w-10 h-10 text-nx-primary" />
                </div>
                <h1 className="text-xl font-headline font-bold text-nx-on-surface mb-3">
                    Report Not Yet Available
                </h1>
                <p className="text-sm text-nx-on-surface-variant max-w-md">
                    {isFinished
                        ? "The analytics report is being generated. It will be available within 24 hours of the event's end time and will be emailed to all admins."
                        : "The report will be automatically generated 24 hours after the event concludes."}
                </p>
            </div>
        );
    }

    const r = event.report;
    const sentimentDist = r.sentimentDistribution as {
        positive: number;
        neutral: number;
        negative: number;
    };
    const sentimentBarWidth = r.sentimentScore !== null
        ? Math.round(((r.sentimentScore + 1) / 2) * 100)
        : 50;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-nx-primary-container text-nx-primary border border-nx-primary/20">
                            Post-Event Report
                        </span>
                        <span className="text-xs text-nx-on-surface-variant">
                            Generated {format(r.generatedAt, "MMM d, yyyy")}
                        </span>
                    </div>
                    <h1 className="text-2xl font-headline font-bold text-nx-on-surface">{event.title}</h1>
                    <p className="text-sm text-nx-on-surface-variant mt-1">
                        {event.organization.name}
                        {event.startDateTime && ` · ${format(event.startDateTime, "MMMM d, yyyy")}`}
                    </p>
                </div>
                <div className="text-center">
                    <div className="text-4xl font-black text-nx-primary">
                        {r.attendanceRate !== null
                            ? `${pct(r.attendanceRate)}`
                            : "—"}
                    </div>
                    <div className="text-xs text-nx-on-surface-variant font-medium mt-0.5">Attendance Rate</div>
                </div>
            </div>

            {/* ── Key Metrics Grid ── */}
            <section>
                <h2 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Key Metrics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        {
                            icon: <Users className="w-5 h-5 text-nx-primary" />,
                            label: "Registrations",
                            value: r.totalRegistrations.toLocaleString(),
                        },
                        {
                            icon: <Users className="w-5 h-5 text-emerald-500" />,
                            label: "Attended",
                            value: `${r.totalAttendance.toLocaleString()} (${pct(r.attendanceRate)})`,
                        },
                        {
                            icon: <Eye className="w-5 h-5 text-blue-500" />,
                            label: "Total Views",
                            value: r.viewsCount.toLocaleString(),
                        },
                        {
                            icon: <Clock className="w-5 h-5 text-purple-500" />,
                            label: "Avg Watch Time",
                            value: r.avgDurationSecs !== null
                                ? `${Math.round(r.avgDurationSecs / 60)} min`
                                : "N/A",
                        },
                    ].map((m) => (
                        <div
                            key={m.label}
                            className="rounded-2xl border border-nx-outline-variant bg-white p-4 flex flex-col gap-2"
                        >
                            <div className="w-9 h-9 rounded-xl bg-nx-surface-container flex items-center justify-center">
                                {m.icon}
                            </div>
                            <div className="text-lg font-black text-nx-on-surface">{m.value}</div>
                            <div className="text-xs text-nx-on-surface-variant">{m.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Avg Rating ── */}
            {r.avgRating !== null && (
                <section className="rounded-2xl border border-nx-outline-variant bg-white p-5">
                    <h2 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Attendee Rating
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-amber-500">{stars(r.avgRating)}</span>
                        <div className="flex-1">
                            <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={i < Math.round(r.avgRating!) ? "text-amber-400 text-xl" : "text-slate-200 text-xl"}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-nx-on-surface-variant mt-1">Average across all feedback submissions</p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Sentiment ── */}
            <section className="rounded-2xl border border-nx-outline-variant bg-white p-5 space-y-4">
                <h2 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    💬 Audience Sentiment
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${sentimentColor(r.sentimentScore)}`}
                                style={{ width: `${sentimentBarWidth}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-sm font-semibold text-nx-on-surface w-20 text-right shrink-0">
                        {sentimentLabel(r.sentimentScore)}
                        {r.sentimentScore !== null && ` (${r.sentimentScore >= 0 ? "+" : ""}${r.sentimentScore.toFixed(2)})`}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 py-3 px-2">
                        <div className="text-xl font-black text-emerald-600">{sentimentDist.positive}%</div>
                        <div className="text-xs text-emerald-700 mt-0.5">Positive 👍</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 border border-amber-100 py-3 px-2">
                        <div className="text-xl font-black text-amber-600">{sentimentDist.neutral}%</div>
                        <div className="text-xs text-amber-700 mt-0.5">Neutral 😐</div>
                    </div>
                    <div className="rounded-xl bg-red-50 border border-red-100 py-3 px-2">
                        <div className="text-xl font-black text-red-600">{sentimentDist.negative}%</div>
                        <div className="text-xs text-red-700 mt-0.5">Negative 👎</div>
                    </div>
                </div>
            </section>

            {/* ── Top Themes ── */}
            {r.topThemes.length > 0 && (
                <section className="rounded-2xl border border-nx-outline-variant bg-white p-5">
                    <h2 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-wider mb-3">
                        🏷 Top Feedback Themes
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {r.topThemes.map((theme) => (
                            <span
                                key={theme}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-nx-primary-container/50 border border-nx-primary/20 text-xs font-semibold text-nx-primary"
                            >
                                {theme}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* ── AI Executive Summary ── */}
            <section className="rounded-2xl border border-nx-primary/20 bg-gradient-to-br from-nx-primary-container/30 to-white p-6 space-y-4">
                <h2 className="text-xs font-bold text-nx-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> AI Executive Summary
                </h2>
                <div className="prose prose-sm max-w-none text-nx-on-surface leading-relaxed whitespace-pre-wrap">
                    {r.aiExecutiveSummary}
                </div>
            </section>

            {/* ── Strengths / Weaknesses / Recommendations (admin only) ── */}
            {isAdmin && (
                <div className="grid sm:grid-cols-3 gap-4">
                    {/* We embed the summary text only — structured S/W/R lives in the EventReport JSON field.
                        For now render placeholder cards; extend with stored JSON if needed in Phase 15. */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                        <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" /> Strengths
                        </h3>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                            See the AI executive summary above for a full analysis of what went well during this event.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
                        <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <TrendingDown className="w-3.5 h-3.5" /> Areas to Improve
                        </h3>
                        <p className="text-xs text-red-800 leading-relaxed">
                            Feedback themes and sentiment distribution highlight areas needing attention for future events.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                        <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5" /> Recommendations
                        </h3>
                        <p className="text-xs text-blue-800 leading-relaxed">
                            This report has been emailed to all organization admins and owners for follow-up action.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
