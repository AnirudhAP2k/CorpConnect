import {
    Users, Building2, Calendar, TrendingUp,
    Activity, Zap, CheckCircle, AlertCircle, Clock, XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/dashboard/StatCard";
import RevenueWidget from "@/components/dashboard/RevenueWidget";
import {
    getAdminPlatformStats,
    getAdminRevenueStats,
    getAdminOrgsList,
    getAdminJobQueueHealth,
} from "@/data/dashboard";
import { format } from "date-fns";
import Link from "next/link";

export default async function AdminDashboardPage() {
    const [platformStats, revenueStats, { orgs }, jobHealth] = await Promise.all([
        getAdminPlatformStats(),
        getAdminRevenueStats(),
        getAdminOrgsList(0, 8),
        getAdminJobQueueHealth(),
    ]);

    const jobStatusConfig = [
        { key: "pending", label: "Pending", count: jobHealth.pending, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
        { key: "processing", label: "Processing", count: jobHealth.processing, icon: Activity, color: "text-blue-600 bg-blue-50" },
        { key: "completed", label: "Completed", count: jobHealth.completed, icon: CheckCircle, color: "text-green-600 bg-green-50" },
        { key: "failed", label: "Failed", count: jobHealth.failed, icon: AlertCircle, color: "text-red-600 bg-red-50" },
        { key: "cancelled", label: "Cancelled", count: jobHealth.cancelled, icon: XCircle, color: "text-gray-500 bg-gray-50" },
    ];

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Platform Overview</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Real-time metrics across all organizations and users · {format(new Date(), "MMMM d, yyyy")}
                </p>
            </div>

            {/* Platform Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Users"
                    value={platformStats.totalUsers.toLocaleString()}
                    description={`+${platformStats.newUsersThisMonth} this month`}
                    icon={Users}
                    trend={{ value: platformStats.newUsersThisMonth, label: "new this month" }}
                    iconClassName="bg-blue-100"
                />
                <StatCard
                    title="Organizations"
                    value={platformStats.totalOrgs.toLocaleString()}
                    description={`${platformStats.verifiedOrgs} verified`}
                    icon={Building2}
                    iconClassName="bg-purple-100"
                />
                <StatCard
                    title="Total Events"
                    value={platformStats.totalEvents.toLocaleString()}
                    description="All time"
                    icon={Calendar}
                    iconClassName="bg-orange-100"
                />
                <StatCard
                    title="Participations"
                    value={platformStats.totalParticipations.toLocaleString()}
                    description={`+${platformStats.newParticipationsThisMonth} this month`}
                    icon={TrendingUp}
                    trend={{ value: platformStats.newParticipationsThisMonth, label: "this month" }}
                    iconClassName="bg-green-100"
                />
            </div>

            {/* Revenue + Job Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueWidget
                    totalRevenue={revenueStats.totalRevenue}
                    paidParticipations={revenueStats.totalPaidParticipations}
                    monthly={revenueStats.monthly}
                    topItems={revenueStats.topOrgs.map((o) => ({ ...o, title: o.name }))}
                    label="Top Organizations by Revenue"
                />

                {/* Job Queue Health */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                            Job Queue Health
                        </CardTitle>
                        <CardDescription>Email sending and background task status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {jobStatusConfig.map((s) => (
                                <div key={s.key} className={`rounded-lg p-3 text-center ${s.color}`}>
                                    <s.icon className="h-4 w-4 mx-auto mb-1" />
                                    <div className="text-xl font-bold">{s.count}</div>
                                    <div className="text-xs font-medium">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {jobHealth.recentFailed.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-red-700 mb-2">Recent Failures</p>
                                <div className="space-y-2">
                                    {jobHealth.recentFailed.slice(0, 3).map((job) => (
                                        <div key={job.id} className="text-xs bg-red-50 border border-red-200 rounded-lg p-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant="outline" className="text-red-700 border-red-300 text-[10px]">
                                                    {job.type}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                    {job.attempts} attempt{job.attempts !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <p className="text-red-600 truncate">{job.error ?? "Unknown error"}</p>
                                        </div>
                                    ))}
                                </div>
                                <Link href="/admin/jobs" className="text-xs text-primary hover:underline mt-2 block">
                                    View all failed jobs →
                                </Link>
                            </div>
                        )}

                        {jobHealth.failed === 0 && jobHealth.pending === 0 && (
                            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="text-sm font-medium">All systems healthy</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Organizations */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Recent Organizations</CardTitle>
                        <CardDescription>Newest organizations on the platform</CardDescription>
                    </div>
                    <Link href="/admin/organizations" className="text-sm text-primary hover:underline">
                        View all →
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-muted/50">
                        {orgs.map((org) => (
                            <div key={org.id} className="flex items-center gap-4 py-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {org.logo ? (
                                        <img src={org.logo} alt={org.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Building2 className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{org.name}</span>
                                        {org.isVerified && (
                                            <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] h-4">✓</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {org.industry.label} · {org.size}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                                    <div>{org._count.members} members</div>
                                    <div>{org._count.events} events</div>
                                </div>
                                <div className="text-xs text-muted-foreground flex-shrink-0">
                                    {format(new Date(org.createdAt), "MMM d")}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* AI Panel */}
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-semibold text-base">AI Microservice Integration Planned</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            A Python/FastAPI microservice will power smart recommendations, semantic search,
                            event summaries, sentiment analysis, and organization match-making. Revenue analytics
                            will be enhanced with Stripe/Razorpay webhooks.
                        </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-primary border-primary/40">
                        Phase 6 & 7
                    </Badge>
                </CardContent>
            </Card>
        </div>
    );
}
