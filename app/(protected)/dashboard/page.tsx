import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Calendar, TrendingUp, Zap, Star, ArrowRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import EventRow from "@/components/dashboard/EventRow";
import { getUserDashboardStats, getRecommendedEvents } from "@/data/dashboard";
import { getUserOrganizations } from "@/data/organization";
import { prisma } from "@/lib/db";

const DashboardPage = async () => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    // Get user with industryId data via their org
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            isAppAdmin: true,
        },

    });

    // Get org industryId separately to avoid complex nested select
    const userWithOrg = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: { select: { industryId: true } } },
    });

    const [stats, orgs, recommendedEvents] = await Promise.all([
        getUserDashboardStats(userId),
        getUserOrganizations(userId),
        getRecommendedEvents(userId, userWithOrg?.organization?.industryId),
    ]);

    return (
        <div className="wrapper py-8">
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h2-bold">Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome back, {session.user.name}!
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {user?.isAppAdmin && (
                            <Link href="/admin/dashboard">
                                <Button variant="outline" size="sm">
                                    ⚡ Admin Console
                                </Button>
                            </Link>
                        )}
                        <Link href="/events/create">
                            <Button>
                                <Calendar className="mr-2 h-4 w-4" />
                                Create Event
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Events Hosted"
                        value={stats.eventsHosted}
                        description="Total events created"
                        icon={Calendar}
                        iconClassName="bg-blue-100"
                    />
                    <StatCard
                        title="Events Attending"
                        value={stats.eventsAttending}
                        description="Active registrations"
                        icon={TrendingUp}
                        iconClassName="bg-purple-100"
                    />
                    <StatCard
                        title="Organizations"
                        value={orgs.length}
                        description="Memberships"
                        icon={Building2}
                        iconClassName="bg-green-100"
                    />
                    <StatCard
                        title="Upcoming"
                        value={stats.upcomingEvents.length}
                        description="Events this month"
                        icon={Star}
                        iconClassName="bg-orange-100"
                    />
                </div>

                {/* Upcoming Events */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle>Upcoming Events</CardTitle>
                            <CardDescription>Events you're registered for</CardDescription>
                        </div>
                        <Link href="/my-events">
                            <Button variant="ghost" size="sm" className="gap-1">
                                View all <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {stats.upcomingEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold text-lg mb-2">No upcoming events</h3>
                                <p className="text-muted-foreground mb-4">
                                    Browse events and register to join
                                </p>
                                <div className="flex gap-4">
                                    <Link href="/events/create">
                                        <Button>Create Event</Button>
                                    </Link>
                                    <Link href="/events">
                                        <Button variant="outline">Browse Events</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-muted/50">
                                {stats.upcomingEvents.map((p) => (
                                    <EventRow key={p.id} event={p.event} badge="attending" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Organizations */}
                {orgs.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle>Your Organizations</CardTitle>
                                <CardDescription>Organizations you belong to</CardDescription>
                            </div>
                            <Link href="/organizations">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    Manage <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {orgs.slice(0, 4).map((org) => (
                                    <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex-shrink-0 overflow-hidden">
                                            {org.logo ? (
                                                <img src={org.logo} alt={org.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{org.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-[10px] h-4">{org.role}</Badge>
                                            </div>
                                        </div>
                                        {(org.role === "OWNER" || org.role === "ADMIN") && (
                                            <Link href={`/organizations/${org.id}/dashboard`}>
                                                <Button variant="ghost" size="sm" className="text-xs h-7">
                                                    Dashboard
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recommended Events */}
                {recommendedEvents.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                Recommended For You
                            </CardTitle>
                            <CardDescription>
                                Public events in your industry you haven't joined yet
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-muted/50">
                                {recommendedEvents.map((event) => (
                                    <EventRow key={event.id} event={event} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AI Panel */}
                <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-semibold text-base">AI Recommendations Coming Soon</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Personalized event suggestions and smart organization matching — powered by our Python/FastAPI AI microservice planned for Phase 7.
                            </p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-primary border-primary/40">
                            Phase 7
                        </Badge>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
