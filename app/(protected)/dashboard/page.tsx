import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
	Building2,
	Calendar,
	TrendingUp,
	Zap,
	Star,
	ArrowRight,
	Sparkles,
	MessageCircle,
	PenTool,
	Bot,
	Shield,
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import EventRow from "@/components/dashboard/EventRow";
import { getUserDashboardStats, getRecommendedEvents } from "@/data/dashboard";
import { getUserOrganizations } from "@/data/organization";
import { getDashboardUser } from "@/domain/users";
import { getUnverifiedOrgsForAdmin } from "@/domain/organizations";
import { VerificationReminderBanner } from "@/components/shared/VerificationReminderBanner";
import Image from "next/image";

const DashboardPage = async () => {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) redirect("/login");

	const user = await getDashboardUser(userId);

	const [stats, orgs, recommendedEvents, unverifiedOrgBanners] =
		await Promise.all([
			getUserDashboardStats(userId),
			getUserOrganizations(userId),
			getRecommendedEvents(userId, user?.industryId),
			getUnverifiedOrgsForAdmin(userId),
		]);

    return (
        <div className="wrapper py-8 font-body text-nx-on-surface">
            <div className="flex flex-col gap-8">
                {/* Verification Reminder Banners */}
                {unverifiedOrgBanners.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {unverifiedOrgBanners.map((o) => (
                            <VerificationReminderBanner
                                key={o.id}
                                orgId={o.id}
                                orgName={o.name}
                                status={(o.meta?.verificationStatus ?? "PENDING") as any}
                            />
                        ))}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="h2-bold font-headline text-nx-on-surface">Dashboard</h1>
                        <p className="mt-2 text-nx-on-surface-variant">
                            Welcome back, {session.user.name}!
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {user?.isAppAdmin && (
                            <Link href="/admin/dashboard">
                                <Button variant="outline" size="sm" className="rounded-xl font-label">
                                    <Shield className="mr-1 h-4 w-4" /> Admin Console
                                </Button>
                            </Link>
                        )}
                        <Link href="/events/create">
                            <Button className="rounded-xl font-label">
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
                        iconClassName="bg-nx-primary-container/25"
                    />
                    <StatCard
                        title="Events Attending"
                        value={stats.eventsAttending}
                        description="Active registrations"
                        icon={TrendingUp}
                        iconClassName="bg-nx-secondary-container/60"
                    />
                    <StatCard
                        title="Organizations"
                        value={orgs.length}
                        description="Memberships"
                        icon={Building2}
                        iconClassName="bg-nx-success-container/60"
                    />
                    <StatCard
                        title="Upcoming"
                        value={stats.upcomingEvents.length}
                        description="Events this month"
                        icon={Star}
                        iconClassName="bg-nx-warning-container/60"
                    />
                </div>

                {/* Upcoming Events */}
                <Card className="rounded-2xl border-nx-outline-variant/60 bg-nx-surface-container-lowest">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                            <CardTitle className="font-headline">Upcoming Events</CardTitle>
                            <CardDescription className="text-nx-on-surface-variant">Events you're registered for</CardDescription>
                        </div>
                        <Link href="/my-events">
                            <Button variant="ghost" size="sm" className="gap-1 rounded-xl font-label">
                                View all <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {stats.upcomingEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Calendar className="mb-4 h-12 w-12 text-nx-on-surface-variant" />
                                <h3 className="mb-2 font-headline text-lg font-semibold">No upcoming events</h3>
                                <p className="mb-4 text-nx-on-surface-variant">
                                    Browse events and register to join
                                </p>
                                <div className="flex gap-4">
                                    <Link href="/events/create">
                                        <Button className="rounded-xl font-label">Create Event</Button>
                                    </Link>
                                    <Link href="/events">
                                        <Button variant="outline" className="rounded-xl font-label">Browse Events</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-nx-outline-variant/50">
                                {stats.upcomingEvents.map((p) => (
                                    <EventRow key={p.id} event={p.event} badge="attending" />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Organizations */}
                {orgs.length > 0 && (
                    <Card className="rounded-2xl border-nx-outline-variant/60 bg-nx-surface-container-lowest">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="font-headline">Your Organizations</CardTitle>
                                <CardDescription className="text-nx-on-surface-variant">Organizations you belong to</CardDescription>
                            </div>
                            <Link href="/organizations">
                                <Button variant="ghost" size="sm" className="gap-1 rounded-xl font-label">
                                    Manage <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {orgs.slice(0, 4).map((org) => (
                                    <div key={org.id} className="flex items-center gap-3 rounded-xl border border-nx-outline-variant/60 p-3 transition-colors hover:bg-nx-surface-container">
                                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-nx-primary-container/30">
                                            {org.logo ? (
                                                <Image src={org.logo} alt={org.name} className="h-full w-full object-cover" width={50}
                                                    height={50} />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <Building2 className="h-5 w-5 text-nx-primary" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate text-sm font-medium text-nx-on-surface">{org.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="h-4 border-nx-outline-variant text-[10px] text-nx-on-surface-variant">{org.role}</Badge>
                                            </div>
                                        </div>
                                        {(org.role === "OWNER" || org.role === "ADMIN") && (
                                            <Link href={`/organizations/${org.id}/dashboard`}>
                                                <Button variant="ghost" size="sm" className="h-7 rounded-xl font-label text-xs">
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
                    <Card className="rounded-2xl border-nx-outline-variant/60 bg-nx-surface-container-lowest">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 font-headline">
                                <Star className="h-5 w-5 text-nx-tertiary" />
                                Recommended For You
                            </CardTitle>
                            <CardDescription className="text-nx-on-surface-variant">
                                Public events in your industry you haven't joined yet
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y divide-nx-outline-variant/50">
                                {recommendedEvents.map((event) => (
                                    <EventRow key={event.id} event={event} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AI Features Panel */}
                <Card className="rounded-2xl border border-nx-primary/20 bg-nx-surface-container-low">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 font-headline">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nx-primary-container/40">
                                    <Sparkles className="h-4 w-4 text-nx-primary" />
                                </div>
                                AI-Powered Features
                            </CardTitle>
                            <Badge className="border-nx-success/30 bg-nx-success-container text-nx-on-success-container">
                                Live
                            </Badge>
                        </div>
                        <CardDescription className="text-nx-on-surface-variant">
                            Intelligent tools to enhance your event management and networking
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* RAG Chat */}
                            <div className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-nx-primary/15 hover:bg-nx-primary-container/20">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-nx-primary-container/40">
                                    <MessageCircle className="h-4 w-4 text-nx-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-nx-on-surface">AI Chat Assistant</p>
                                    <p className="mt-0.5 text-xs text-nx-on-surface-variant">
                                        Ask questions about any event or organization — answers grounded in real documents via RAG.
                                    </p>
                                </div>
                            </div>

                            {/* AI Writer */}
                            <div className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-nx-primary/15 hover:bg-nx-primary-container/20">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-nx-primary-container/40">
                                    <PenTool className="h-4 w-4 text-nx-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-nx-on-surface">AI Writer</p>
                                    <p className="mt-0.5 text-xs text-nx-on-surface-variant">
                                        Generate polished event descriptions from rough drafts, using your org&apos;s brand context.
                                    </p>
                                </div>
                            </div>

                            {/* Smart Recommendations */}
                            <div className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-nx-primary/15 hover:bg-nx-primary-container/20">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-nx-primary-container/40">
                                    <Zap className="h-4 w-4 text-nx-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-nx-on-surface">Smart Recommendations</p>
                                    <p className="mt-0.5 text-xs text-nx-on-surface-variant">
                                        Personalized event and organization suggestions powered by vector embeddings.
                                    </p>
                                </div>
                            </div>

                            {/* Enterprise Brainstorming */}
                            <div className="flex items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-nx-primary/15 hover:bg-nx-primary-container/20">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-nx-primary-container/40">
                                    <Bot className="h-4 w-4 text-nx-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 text-sm font-medium text-nx-on-surface">
                                        AI Event Brainstorming
                                        <Badge variant="outline" className="h-4 border-nx-primary/30 px-1.5 text-[10px] text-nx-primary">Enterprise</Badge>
                                    </p>
                                    <p className="mt-0.5 text-xs text-nx-on-surface-variant">
                                        Brainstorm event ideas with AI, generate briefs, and pitch them to your org admin.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick action links */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-nx-outline-variant/60 pt-3">
                            <Link href="/events">
                                <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-xl font-label text-xs text-nx-primary hover:bg-nx-primary-container/30 hover:text-nx-primary">
                                    Browse Events <ArrowRight className="h-3 w-3" />
                                </Button>
                            </Link>
                            {user?.activeOrganizationId && (
                                <Link href={`/organizations/${user.activeOrganizationId}/ai-planner`}>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-xl font-label text-xs text-nx-primary hover:bg-nx-primary-container/30 hover:text-nx-primary">
                                        <Sparkles className="h-3 w-3" /> AI Brainstorming
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
