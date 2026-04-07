import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Globe,
  MapPin,
  Link2,
  Share2,
  CalendarDays,
  UserPlus,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  Building2,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/* ─── Page ───────────────────────────────────────────────────────── */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      organization: {
        include: { industry: true }
      },
    },
  });

  if (!user) redirect("/sign-in");

  const fullName = user.name || `${user.name ?? ""} ${user.name ?? ""}`.trim() || "Anonymous User";
  const initials = fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const primaryOrg = user.organization;
  const jobTitle = primaryOrg ? `Member · ${primaryOrg.name}` : "Professional Member";
  const industry = primaryOrg?.industry?.label ?? "Business Professional";
  const location = primaryOrg?.location ?? "Global";

  const org = user.organization;
  const orgCount = org ? 1 : 0

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
              {[
                { label: "Organizations", value: orgCount },
                { label: "Platform Role", value: user.role === "ADMIN" ? "Admin" : "Member" },
                { label: "Member Since", value: new Date(user.createdAt).getFullYear() },
              ].map((stat) => (
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

            {/* Professional Summary */}
            <section className="bg-white rounded-3xl p-8 shadow-nx-card">
              <h2 className="text-xl font-headline font-semibold text-nx-primary mb-5 flex items-center">
                <SectionAccent />
                Professional Summary
              </h2>
              <div className="space-y-3 text-[0.9375rem] font-body text-nx-on-surface-variant leading-relaxed">
                <p>
                  Welcome to my professional profile on CorpConnect. I&apos;m actively building meaningful B2B connections
                  across the {industry} space, with a focus on strategic partnerships, industry events, and collaborative growth.
                </p>
                {primaryOrg && (
                  <p>
                    Currently affiliated with <span className="font-semibold text-nx-primary">{primaryOrg.name}</span>.
                    Open to introductions, co-ventures, and high-value networking opportunities.
                  </p>
                )}
              </div>
            </section>

            {/* Organizations / Experience */}
            {user.organization && (
              <section className="bg-white rounded-3xl p-8 shadow-nx-card">
                <h2 className="text-xl font-headline font-semibold text-nx-primary mb-7">
                  Organization Affiliations
                </h2>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="flex-none w-12 h-12 bg-nx-surface-container-low rounded-xl flex items-center justify-center shrink-0">
                      {user.organization.logo ? (
                        <Image src={user.organization.logo} alt={user.organization.name} width={32} height={32} className="rounded-lg object-cover" />
                      ) : (
                        <Briefcase className="w-5 h-5 text-nx-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                        <h3 className="text-base font-headline font-semibold text-nx-primary">
                          {user.role?.replace("_", " ") || "Member"}
                        </h3>
                        <span className="text-[11px] font-label font-medium text-nx-on-surface-variant uppercase tracking-widest shrink-0">
                          {new Date(user.createdAt).getFullYear()} — Present
                        </span>
                      </div>
                      <Link href={`/organizations/${user.organization.id}`} className="text-sm font-medium text-nx-on-tertiary-container hover:underline underline-offset-2">
                        {user.organization.name}
                      </Link>
                      {user.organization.location && (
                        <p className="text-sm text-nx-on-surface-variant mt-1">{user.organization.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Endorsements — Bento style */}
            <section>
              <h2 className="text-xl font-headline font-semibold text-nx-primary mb-6">
                Network Highlights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dark endorsement */}
                <div className="bg-nx-primary text-white p-6 rounded-2xl flex flex-col justify-between min-h-[160px]">
                  <p className="text-sm font-body italic leading-relaxed opacity-90">
                    &ldquo;CorpConnect has been instrumental in expanding our partner network. The platform&apos;s B2B focus makes every connection meaningful.&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-headline font-bold">Elite Member</p>
                      <p className="text-xs opacity-60">CorpConnect Platform</p>
                    </div>
                  </div>
                </div>

                {/* Light endorsement */}
                <div className="bg-nx-surface-container-high p-6 rounded-2xl flex flex-col justify-between min-h-[160px]">
                  <p className="text-sm font-body italic text-nx-on-surface-variant leading-relaxed">
                    &ldquo;The event matchmaking and meeting request features are exceptional. A true professional networking evolution.&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <div className="w-9 h-9 rounded-full bg-nx-surface-container flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-nx-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-headline font-bold text-nx-primary">Platform Review</p>
                      <p className="text-xs text-nx-on-surface-variant">Verified Member</p>
                    </div>
                  </div>
                </div>
              </div>
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
                <ContactRow icon={<Globe className="w-4 h-4" />} value="corpconnect.app" />
              </div>

              <div className="flex gap-3 mt-6 justify-center">
                <button className="w-9 h-9 rounded-full bg-nx-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-nx-primary">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-full bg-nx-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-nx-primary">
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* Skills / Domains */}
            <section className="bg-nx-surface-container-low rounded-3xl p-6">
              <p className="text-[10px] font-label font-bold text-nx-on-surface-variant uppercase tracking-[0.1em] mb-5">
                Strategic Domains
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "B2B Networking",
                  "Strategic Partnerships",
                  industry,
                  "Event Management",
                  "Corporate Growth",
                  "Industry Groups",
                ].filter(Boolean).map((skill) => (
                  <SkillChip key={skill} label={skill} />
                ))}
              </div>
            </section>

            {/* Network stats */}
            <section className="bg-white rounded-3xl p-6 shadow-nx-card overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-nx-tertiary-container/5 rounded-bl-full pointer-events-none" />
              <p className="text-[10px] font-label font-bold text-nx-on-surface-variant uppercase tracking-[0.1em] mb-5">
                Your Network
              </p>
              <div className="flex items-center gap-4 mb-4">
                {/* Stacked avatars placeholder */}
                <div className="flex -space-x-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full ring-2 ring-white bg-nx-surface-container-high flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-nx-primary">{["JT", "MK", "AR"][i]}</span>
                    </div>
                  ))}
                  <div className="w-9 h-9 rounded-full ring-2 ring-white bg-nx-surface-container flex items-center justify-center text-[9px] font-bold text-nx-on-surface-variant">
                    +{Math.max(0, orgCount * 3)}
                  </div>
                </div>
              </div>
              <p className="text-xs font-body text-nx-on-surface-variant leading-relaxed">
                You are connected to{" "}
                <span className="font-bold text-nx-primary">{orgCount} organization{orgCount !== 1 ? "s" : ""}</span>{" "}
                and growing across the {industry} cluster.
              </p>
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
                  <Building2 className="w-4 h-4" />
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
