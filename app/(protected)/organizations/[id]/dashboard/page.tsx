import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
    Calendar, Users, Building2, TrendingUp,
    Zap, Star, ArrowRight, Activity, Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/dashboard/StatCard";
import EventRow from "@/components/dashboard/EventRow";
import RevenueWidget from "@/components/dashboard/RevenueWidget";
import { getOrganizationById } from "@/data/organization";
import { getHostEvents, getAttendingEvents } from "@/data/events";
import { getOrgConnections, getOrgDashboardStats, getOrgRecentActivity, getOrgRevenueBreakdown } from "@/data/dashboard";
import { format } from "date-fns";
import OrgConnectionsPanel from "@/components/organizations/OrgConnectionsPanel";
import { prisma } from "@/lib/db";
import OrgAIPanel from "@/components/organizations/OrgAIPanel";
import { ChatWidget } from "@/components/ai/ChatWidget";

interface OrgDashboardPageProps {
    params: Promise<{ id: string }>;
}

const OrgDashboardPage = async ({ params }: OrgDashboardPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    const { id: orgId } = await params;

    // Verify org exists and user is OWNER or ADMIN
    let org;
    try {
        org = await getOrganizationById(orgId);
    } catch {
        notFound();
    }

    const membership = org.members.find((m) => m.userId === userId);
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        redirect(`/organizations/${orgId}`);
    }

    // Fetch all dashboard data in parallel
    const [stats, hostedEvents, attendingEvents, recentActivity, revenueBreakdown, allConnections] =
        await Promise.all([
            getOrgDashboardStats(orgId),
            getHostEvents(orgId),
            getAttendingEvents(orgId),
            getOrgRecentActivity(orgId),
            getOrgRevenueBreakdown(orgId),
            getOrgConnections(orgId),
        ]);

    const acceptedConnections = allConnections.filter((c: any) => c.status === "ACCEPTED");
    const pendingSent = allConnections.filter((c: any) => c.status === "PENDING" && c.sourceOrgId === orgId);
    const pendingReceived = allConnections.filter((c: any) => c.status === "PENDING" && c.targetOrgId === orgId);

    // Fetch ApiCredentials
    const apiCredential = await prisma.apiCredential.findUnique({
        where: { organizationId: orgId },
    });

    const statusColor: Record<string, string> = {
        REGISTERED: "bg-blue-100 text-blue-700",
        ATTENDED: "bg-green-100 text-green-700",
        CANCELLED: "bg-red-100 text-red-700",
        WAITLISTED: "bg-yellow-100 text-yellow-700",
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50/50">

                {/* Header */}
                <section className="bg-white border-b border-gray-200 py-6">
                    <div className="wrapper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {org.logo ? (
                                <img src={org.logo} alt={org.name} className="h-12 w-12 rounded-xl object-cover border" />
                            ) : (
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold">{org.name}</h1>
                                    {org.isVerified && (
                                        <Badge className="bg-blue-100 text-blue-700 border-0">
                                            ✓ Verified
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {org.industry.label} · {membership.role}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/organizations/${orgId}`}>
                                <Button variant="outline" size="sm">View Public Page</Button>
                            </Link>
                            <Link href="/events/create">
                                <Button size="sm">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Create Event
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="wrapper py-8 space-y-8">
                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard
                            title="Events Hosted"
                            value={stats.eventsHosted}
                            description="All time"
                            icon={Calendar}
                            iconClassName="bg-blue-100"
                        />
                        <StatCard
                            title="Events Attending"
                            value={stats.eventsAttending}
                            description="Upcoming registrations"
                            icon={Star}
                            iconClassName="bg-purple-100"
                        />
                        <StatCard
                            title="Members"
                            value={stats.membersCount}
                            description={`${membership.role === "OWNER" ? "You are the owner" : "You are an admin"}`}
                            icon={Users}
                            iconClassName="bg-green-100"
                        />
                        <StatCard
                            title="Total Attendees"
                            value={stats.participationsAsHost}
                            description="Across all your events"
                            icon={TrendingUp}
                            iconClassName="bg-orange-100"
                        />
                        <StatCard
                            title="Revenue"
                            value={stats.totalRevenue > 0
                                ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(stats.totalRevenue)
                                : "₹0"
                            }
                            description="From paid events"
                            icon={TrendingUp}
                            iconClassName="bg-emerald-100"
                        />
                    </div>

                    {/* Events Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upcoming Hosted Events */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <CardTitle className="text-base">Events You're Hosting</CardTitle>
                                    <CardDescription>Upcoming events organized by {org.name}</CardDescription>
                                </div>
                                <Link href={`/organizations/${orgId}`}>
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        View all <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {hostedEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                                        <p className="font-medium text-sm">No upcoming events</p>
                                        <p className="text-xs text-muted-foreground mt-1">Create an event to get started</p>
                                        <Link href="/events/create" className="mt-3">
                                            <Button size="sm">Create Event</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-muted/50">
                                        {hostedEvents.slice(0, 5).map((event) => (
                                            <EventRow key={event.id} event={event} badge="hosting" />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Attending Events */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <div>
                                    <CardTitle className="text-base">Events You're Attending</CardTitle>
                                    <CardDescription>Events your organization has registered for</CardDescription>
                                </div>
                                <Link href="/my-events">
                                    <Button variant="ghost" size="sm" className="gap-1">
                                        View all <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                {attendingEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <Star className="h-10 w-10 text-muted-foreground mb-3" />
                                        <p className="font-medium text-sm">No upcoming registrations</p>
                                        <p className="text-xs text-muted-foreground mt-1">Browse events to join</p>
                                        <Link href="/events" className="mt-3">
                                            <Button size="sm" variant="outline">Browse Events</Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-muted/50">
                                        {attendingEvents.slice(0, 5).map((event) => (
                                            <EventRow key={event.id} event={event} badge="attending" />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Revenue + Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Widget */}
                        <RevenueWidget
                            totalRevenue={revenueBreakdown.totalRevenue}
                            paidParticipations={revenueBreakdown.paidParticipations}
                            monthly={revenueBreakdown.monthly}
                            topItems={revenueBreakdown.topEvents.map((e) => ({ ...e, title: e.title }))}
                            label="Top Events by Revenue"
                        />

                        {/* Recent Activity */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Activity className="h-5 w-5 text-muted-foreground" />
                                    Recent Activity
                                </CardTitle>
                                <CardDescription>Latest participations across your events</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {recentActivity.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <Activity className="h-10 w-10 text-muted-foreground mb-3" />
                                        <p className="text-sm font-medium">No activity yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentActivity.map((a) => (
                                            <div key={a.id} className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                                                    {a.user.image ? (
                                                        <img src={a.user.image} alt={a.user.name ?? ""} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                            {a.user.name?.[0] ?? "?"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm leading-tight">
                                                        <span className="font-medium">{a.user.name ?? "Someone"}</span>
                                                        {a.organization && a.organization.id !== orgId && (
                                                            <> from <span className="font-medium">{a.organization.name}</span></>
                                                        )}
                                                        {" "}registered for{" "}
                                                        <Link href={`/events/${a.event.id}`} className="font-medium text-primary hover:underline">
                                                            {a.event.title}
                                                        </Link>
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[a.status] ?? "bg-gray-100 text-gray-700"}`}>
                                                            {a.status}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {format(new Date(a.createdAt), "MMM d, h:mm a")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Active Panel */}
                    <OrgAIPanel
                        orgId={orgId}
                        hasCredentials={!!apiCredential}
                        usageCount={apiCredential?.usageCount || 0}
                        usageLimit={apiCredential?.usageLimit || 100}
                        tier={apiCredential?.tier || "FREE"}
                    />

                    {/* Org Connections Panel */}
                    <OrgConnectionsPanel
                        orgId={orgId}
                        accepted={acceptedConnections}
                        pendingSent={pendingSent}
                        pendingReceived={pendingReceived}
                    />
                </div>
            </div>

            {/* AI Chat Widget — available to org admins/owners */}
            <ChatWidget
                contextId={orgId}
                contextType="ORGANIZATION"
                contextName={org.name}
            />
        </>
    );
};

export default OrgDashboardPage;
