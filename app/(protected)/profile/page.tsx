import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  MapPin,
  Share2,
  CalendarDays,
  UserPlus,
  MoreHorizontal,
  Briefcase,
  Building2,
  Star,
  Calendar,
  ArrowRight,
  Users,
  Handshake,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserProfileData } from "@/domain/users";
import { format } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile | CorpConnect",
  description: "Your professional profile on CorpConnect — the elite B2B networking platform.",
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function SectionAccent() {
  return <span className="inline-block w-8 h-1 bg-nx-tertiary-container rounded-full mr-3 align-middle" />;
}

function LabelTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-label font-semibold uppercase tracking-[0.08em] text-nx-on-tertiary-container bg-nx-tertiary-container/10 px-3 py-1 rounded-full">
      {children}
    </span>
  );
}

function SkillChip({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 bg-white rounded-lg text-xs font-label font-semibold text-nx-primary border border-nx-surface-container-high shadow-nx-card">
      {label}
    </span>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-nx-surface-container-low rounded-xl">
      <span className="text-nx-on-tertiary-container shrink-0">{icon}</span>
      <span className="text-sm font-body text-nx-on-surface truncate">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text, linkText, linkHref }: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="w-8 h-8 text-nx-outline mb-2" />
      <p className="text-sm text-nx-on-surface-variant">{text}</p>
      {linkText && linkHref && (
        <Link href={linkHref} className="mt-3">
          <Button size="sm" variant="outline" className="text-xs">{linkText}</Button>
        </Link>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const profileData = await getUserProfileData(session.user.id);
  if (!profileData) redirect("/sign-in");

  const {
    user,
    eventsAttended,
    eventsRegistered,
    upcomingEvents,
    connectionsCount,
    recentParticipations,
    orgMembers,
  } = profileData;

  const fullName = user.name || "Anonymous User";
  const initials = fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const primaryOrg = user.organization;
  const jobTitle = primaryOrg ? `Member · ${primaryOrg.name}` : "Professional Member";
  const industry = primaryOrg?.industry?.label ?? "Business Professional";
  const location = primaryOrg?.location ?? "Global";

  const primaryMembership = user.organizationMemberships.find(
    (m) => m.organizationId === user.organizationId
  );
  const primaryRole = primaryMembership?.role ?? "MEMBER";

  // Dynamic stats derived from real DB data
  const stats = [
    { label: "Events Registered", value: eventsRegistered },
    { label: "Events Attended", value: eventsAttended },
    { label: "Connections", value: connectionsCount },
    { label: "Member Since", value: format(new Date(user.createdAt), "MMM yyyy") },
  ];

  // Build dynamic domain tags from org data
  const domainTags: string[] = [];
  if (industry && industry !== "Business Professional") domainTags.push(industry);
  if (primaryOrg?.services) {
    (primaryOrg as any).services?.slice(0, 3).forEach((s: string) => domainTags.push(s));
  }
  if (primaryOrg?.technologies) {
    (primaryOrg as any).technologies?.slice(0, 2).forEach((t: string) => domainTags.push(t));
  }
  if (domainTags.length === 0) domainTags.push("B2B Networking");

  return (
    <div className="min-h-screen bg-nx-background">
      <div className="pt-8 pb-16 px-6 md:px-10 max-w-7xl mx-auto">

        {/* ══════════════════════════════════════════
                    HERO — Asymmetric editorial layout (12-col)
                    ══════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-start">

          {/* Avatar column */}
          <div className="lg:col-span-3 relative group">
            <div className="aspect-square rounded-3xl overflow-hidden bg-nx-surface-container-high shadow-nx-float relative z-10 max-w-[260px]">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={fullName}
                  fill
                  className="object-cover"
                  sizes="260px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-nx-cta-gradient">
                  <span className="text-6xl font-headline font-bold text-white">
                    {initials}
                  </span>
                </div>
              )}
            </div>
            {/* Decorative accent */}
            <div className="absolute -bottom-4 -right-4 w-28 h-28 bg-nx-tertiary-container rounded-2xl -z-0 opacity-20 pointer-events-none" />
          </div>

          {/* Bio column */}
          <div className="lg:col-span-9 lg:pt-6">
            <div className="mb-3">
              <LabelTag>{industry}</LabelTag>
              {user.isAppAdmin && (
                <Badge className="ml-2 bg-amber-100 text-amber-700 border-0 text-[10px]">Platform Admin</Badge>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-headline font-bold text-nx-primary mb-3 tracking-tight leading-tight">
              {fullName}
            </h1>

            <p className="text-lg font-body text-nx-on-surface-variant mb-6 max-w-2xl leading-relaxed">
              {jobTitle}
              {location && (
                <span className="ml-2 text-nx-outline">· {location}</span>
              )}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 mb-8">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="text-2xl font-headline font-bold text-nx-primary">{stat.value}</span>
                  <span className="text-[11px] font-label text-nx-on-surface-variant uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link href="/onboarding">
                <Button className="px-6 py-3 h-auto bg-nx-primary text-white rounded-xl font-headline font-semibold shadow-nx-primary hover:opacity-90 hover:scale-[1.02] transition-all flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Edit Profile
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="outline" className="px-6 py-3 h-auto bg-nx-surface-container-high border-0 text-nx-on-surface font-headline font-semibold rounded-xl hover:bg-nx-surface-container-highest transition-colors flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Browse Events
                </Button>
              </Link>
              <Button variant="ghost" className="p-3 h-auto bg-nx-surface-container-low text-nx-on-surface-variant rounded-xl hover:text-nx-primary transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
                    MAIN GRID — 12 col (8 content + 4 sidebar)
                    ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left: Content column ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Organization Affiliations */}
            {primaryOrg && (
              <section className="bg-white rounded-3xl p-8 shadow-nx-card">
                <h2 className="text-xl font-headline font-semibold text-nx-primary mb-7">
                  Organization Affiliations
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="flex-none w-12 h-12 bg-nx-surface-container-low rounded-xl flex items-center justify-center shrink-0">
                      {primaryOrg.logo ? (
                        <Image src={primaryOrg.logo} alt={primaryOrg.name} width={32} height={32} className="rounded-lg object-cover" />
                      ) : (
                        <Briefcase className="w-5 h-5 text-nx-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                        <h3 className="text-base font-headline font-semibold text-nx-primary">
                          {primaryRole.replace("_", " ") || "Member"}
                        </h3>
                        <span className="text-[11px] font-label font-medium text-nx-on-surface-variant uppercase tracking-widest shrink-0">
                          {format(new Date(user.createdAt), "yyyy")} — Present
                        </span>
                      </div>
                      <Link href={`/organizations/${primaryOrg.id}`} className="text-sm font-medium text-nx-on-tertiary-container hover:underline underline-offset-2">
                        {primaryOrg.name}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-xs text-nx-on-surface-variant">
                        {primaryOrg.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{primaryOrg.location}</span>
                        )}
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{primaryOrg._count.members} members</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{primaryOrg._count.events} events</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            <section className="bg-white rounded-3xl p-8 shadow-nx-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-headline font-semibold text-nx-primary flex items-center">
                  <SectionAccent />
                  Upcoming Events
                </h2>
                <Link href="/my-events" className="text-xs font-label font-semibold text-nx-on-tertiary-container hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((p) => (
                    <Link
                      key={p.id}
                      href={`/events/${p.event.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-nx-surface-container-low transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-nx-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarDays className="w-5 h-5 text-nx-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-headline font-semibold text-nx-primary truncate group-hover:underline">
                          {p.event.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-nx-on-surface-variant mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(p.event.startDateTime), "MMM d, yyyy · h:mm a")}
                          </span>
                          {p.event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {p.event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {p.event.organization && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-nx-on-surface-variant bg-nx-surface-container-high px-2 py-1 rounded-full">
                          <Building2 className="w-3 h-3" />
                          {p.event.organization.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  text="No upcoming events yet"
                  linkText="Browse Events"
                  linkHref="/events"
                />
              )}
            </section>

            {/* Recent Activity */}
            <section className="bg-white rounded-3xl p-8 shadow-nx-card">
              <h2 className="text-xl font-headline font-semibold text-nx-primary mb-6 flex items-center">
                <SectionAccent />
                Recent Activity
              </h2>
              {recentParticipations.length > 0 ? (
                <div className="space-y-4">
                  {recentParticipations.map((p) => (
                    <div key={p.id} className="flex items-start gap-4 p-3 rounded-xl bg-nx-surface-container-low">
                      <div className="w-8 h-8 rounded-full bg-nx-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-nx-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-nx-on-surface">
                          Registered for{" "}
                          <Link href={`/events/${p.event.id}`} className="font-semibold text-nx-primary hover:underline">
                            {p.event.title}
                          </Link>
                        </p>
                        <p className="text-xs text-nx-on-surface-variant mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(p.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Star}
                  text="No activity yet — register for events to get started"
                  linkText="Explore Events"
                  linkHref="/events"
                />
              )}
            </section>
          </div>

          {/* ── Right: Sidebar stats ── */}
          <aside className="lg:col-span-4 space-y-6">

            {/* Contact Info */}
            <section className="bg-white rounded-3xl p-6 shadow-nx-card border-l-4 border-nx-tertiary-container">
              <p className="text-[10px] font-label font-bold text-nx-on-surface-variant uppercase tracking-[0.1em] mb-5">
                Contact Channels
              </p>
              <div className="space-y-3">
                <ContactRow icon={<Mail className="w-4 h-4" />} value={user.email || "Not Verified"} />
                {primaryOrg?.location && (
                  <ContactRow icon={<MapPin className="w-4 h-4" />} value={primaryOrg.location} />
                )}
                {primaryOrg?.website && (
                  <ContactRow icon={<Building2 className="w-4 h-4" />} value={(primaryOrg as any).website} />
                )}
              </div>

              <div className="flex gap-3 mt-6 justify-center">
                <button className="w-9 h-9 rounded-full bg-nx-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-nx-primary">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* Domains / Expertise — derived from org data */}
            <section className="bg-nx-surface-container-low rounded-3xl p-6">
              <p className="text-[10px] font-label font-bold text-nx-on-surface-variant uppercase tracking-[0.1em] mb-5">
                Domains &amp; Expertise
              </p>
              <div className="flex flex-wrap gap-2">
                {domainTags.map((skill) => (
                  <SkillChip key={skill} label={skill} />
                ))}
                {primaryOrg?.isVerified && (
                  <span className="px-3 py-1.5 bg-green-50 rounded-lg text-xs font-label font-semibold text-green-700 border border-green-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified Org
                  </span>
                )}
              </div>
            </section>

            {/* Network — Real org members + connections */}
            <section className="bg-white rounded-3xl p-6 shadow-nx-card overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-nx-tertiary-container/5 rounded-bl-full pointer-events-none" />
              <p className="text-[10px] font-label font-bold text-nx-on-surface-variant uppercase tracking-[0.1em] mb-5">
                Your Network
              </p>

              {orgMembers.length > 0 ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex -space-x-3">
                      {orgMembers.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="w-9 h-9 rounded-full ring-2 ring-white bg-nx-surface-container-high flex items-center justify-center overflow-hidden"
                          title={m.user.name ?? ""}
                        >
                          {m.user.image ? (
                            <Image src={m.user.image} alt={m.user.name ?? ""} width={36} height={36} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-nx-primary">
                              {(m.user.name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                      {orgMembers.length > 4 && (
                        <div className="w-9 h-9 rounded-full ring-2 ring-white bg-nx-surface-container flex items-center justify-center text-[9px] font-bold text-nx-on-surface-variant">
                          +{orgMembers.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-body text-nx-on-surface-variant leading-relaxed">
                    <span className="font-bold text-nx-primary">{orgMembers.length}</span> colleague{orgMembers.length !== 1 ? "s" : ""} in your organization
                    {connectionsCount > 0 && (
                      <> · <span className="font-bold text-nx-primary">{connectionsCount}</span> org connection{connectionsCount !== 1 ? "s" : ""}</>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-xs font-body text-nx-on-surface-variant leading-relaxed">
                  {connectionsCount > 0 ? (
                    <>Your organization has <span className="font-bold text-nx-primary">{connectionsCount}</span> connection{connectionsCount !== 1 ? "s" : ""}</>
                  ) : (
                    "Join an organization to start building your network"
                  )}
                </p>
              )}

              {primaryOrg && (
                <Link href={`/organizations/${primaryOrg.id}`} className="mt-4 inline-flex items-center gap-1 text-xs font-label font-semibold text-nx-on-tertiary-container hover:underline">
                  View organization <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </section>

            {/* Quick actions */}
            <section className="bg-nx-primary-container rounded-3xl p-6">
              <p className="text-[10px] font-label font-semibold text-white/60 uppercase tracking-[0.1em] mb-4">
                Quick Actions
              </p>
              <div className="space-y-2">
                <Link
                  href="/organizations/discover"
                  className="flex items-center gap-3 w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-headline font-medium transition-colors"
                >
                  <Handshake className="w-4 h-4" />
                  Discover Organizations
                </Link>
                <Link
                  href="/events"
                  className="flex items-center gap-3 w-full py-2.5 px-4 bg-nx-primary hover:opacity-90 text-white rounded-xl text-sm font-headline font-semibold transition-opacity shadow-nx-primary"
                >
                  <CalendarDays className="w-4 h-4" />
                  Browse Events
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
