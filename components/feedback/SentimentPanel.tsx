"use client";

import { useEffect, useState, useTransition } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, MessageSquare, Star, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrgFeedbackSummary } from "@/lib/actions/feedback";
import type { FeedbackSummary } from "@/lib/actions/feedback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentimentPanelProps {
    orgId: string;
}

type EventSummary = FeedbackSummary & { eventTitle: string; eventId: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTIMENT_COLORS = {
    POSITIVE: "#22c55e",
    NEUTRAL: "#f59e0b",
    NEGATIVE: "#ef4444",
};

const RATING_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

const SENTIMENT_EMOJI: Record<string, string> = {
    POSITIVE: "😊",
    NEUTRAL: "😐",
    NEGATIVE: "😞",
};

// ─── Star display helper ──────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
    return (
        <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}
                />
            ))}
        </span>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string | number; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-muted/40 rounded-xl p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-xl font-bold leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SentimentPanel({ orgId }: SentimentPanelProps) {
    const [summaries, setSummaries] = useState<EventSummary[]>([]);
    const [selected, setSelected] = useState<EventSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = () => {
        startTransition(async () => {
            const res = await getOrgFeedbackSummary(orgId);
            if (res.success) {
                const withData = res.data.filter(e => e.totalResponses > 0);
                setSummaries(withData);
                setSelected(withData[0] ?? null);
                setError(null);
            } else {
                setError(res.error);
            }
        });
    };

    useEffect(() => { load(); }, [orgId]);

    // ── Loading / error states ────────────────────────────────────────────────
    if (isPending && summaries.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        Feedback Intelligence
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                        Loading feedback data…
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Feedback Intelligence
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-destructive">{error}</CardContent>
            </Card>
        );
    }

    if (summaries.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        Feedback Intelligence
                    </CardTitle>
                    <CardDescription>AI-powered sentiment analysis of attendee feedback</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
                        <p className="font-medium">No feedback yet</p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Feedback submitted by event attendees will appear here, with AI-powered sentiment analysis.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const s = selected!;

    // Pie chart data
    const pieData = [
        { name: "Positive", value: s.sentimentBreakdown.positive, color: SENTIMENT_COLORS.POSITIVE },
        { name: "Neutral", value: s.sentimentBreakdown.neutral, color: SENTIMENT_COLORS.NEUTRAL },
        { name: "Negative", value: s.sentimentBreakdown.negative, color: SENTIMENT_COLORS.NEGATIVE },
    ].filter(d => d.value > 0);

    // Bar chart data (rating distribution)
    const barData = [1, 2, 3, 4, 5].map(r => ({
        rating: `★${r}`,
        count: (s.ratingDistribution[r] ?? 0) as number,
        fill: RATING_COLORS[r - 1],
    }));

    const positivePercent = s.totalResponses > 0
        ? Math.round((s.sentimentBreakdown.positive / s.totalResponses) * 100)
        : 0;

    return (
        <Card id="sentiment-panel">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Feedback Intelligence
                    </CardTitle>
                    <CardDescription>AI-powered sentiment analysis · last 10 events</CardDescription>
                </div>
                <Button
                    id="sentiment-refresh-btn"
                    variant="ghost"
                    size="sm"
                    onClick={load}
                    disabled={isPending}
                    className="gap-1"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Event selector */}
                {summaries.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                        {summaries.map(ev => (
                            <button
                                key={ev.eventId}
                                id={`sentiment-event-${ev.eventId}`}
                                onClick={() => setSelected(ev)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selected?.eventId === ev.eventId
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary"
                                    }`}
                            >
                                {ev.eventTitle.length > 28 ? ev.eventTitle.slice(0, 28) + "…" : ev.eventTitle}
                                <span className="ml-1.5 opacity-70">({ev.totalResponses})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* KPI strip */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard
                        label="Avg Rating"
                        value={`${s.averageRating} / 5`}
                        icon={Star}
                        color="bg-amber-100 text-amber-600"
                    />
                    <StatCard
                        label="Responses"
                        value={s.totalResponses}
                        sub={s.pendingAnalysis > 0 ? `${s.pendingAnalysis} pending AI` : undefined}
                        icon={MessageSquare}
                        color="bg-blue-100 text-blue-600"
                    />
                    <StatCard
                        label="Positive"
                        value={`${positivePercent}%`}
                        icon={TrendingUp}
                        color="bg-green-100 text-green-600"
                    />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sentiment pie */}
                    {pieData.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Sentiment Breakdown</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        dataKey="value"
                                        paddingAngle={3}
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        formatter={(value) => (
                                            <span className="text-xs text-muted-foreground">{value}</span>
                                        )}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`${value} response${value !== 1 ? "s" : ""}`, ""]}
                                        contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Rating bar chart */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Rating Distribution</p>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={barData} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    formatter={(v: any) => [`${v} response${v !== 1 ? "s" : ""}`, "Count"]}
                                    contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {barData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top themes */}
                {s.topThemes.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Top Themes</p>
                        <div className="flex flex-wrap gap-2">
                            {s.topThemes.map(({ theme, count }) => (
                                <Badge
                                    key={theme}
                                    variant="secondary"
                                    className="text-xs gap-1 font-normal"
                                >
                                    {theme}
                                    <span className="text-muted-foreground/70">×{count}</span>
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent comments */}
                {s.recentComments.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recent Comments</p>
                        <div className="space-y-2">
                            {s.recentComments.map(c => (
                                <div
                                    key={c.id}
                                    className="p-3 rounded-lg border border-muted bg-muted/20 space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <StarRating rating={c.rating} />
                                        {c.sentiment && (
                                            <span className="text-xs text-muted-foreground">
                                                {SENTIMENT_EMOJI[c.sentiment]} {c.sentiment}
                                            </span>
                                        )}
                                    </div>
                                    {c.aiSummary ? (
                                        <p className="text-sm text-foreground/80 italic">"{c.aiSummary}"</p>
                                    ) : (
                                        <p className="text-sm text-foreground/80">"{c.feedbackText}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
