import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Network,
  BrainCircuit,
  CalendarDays,
  UsersRound,
  Building2,
  ShieldCheck,
  Zap,
} from "lucide-react";

/* ─── Static data ──────────────────────────────────────────────── */
const STATS = [
  { value: "40+", label: "Countries" },
  { value: "12k+", label: "Organisations" },
  { value: "500+", label: "Events / year" },
  { value: "95%", label: "Retention rate" },
];

const STORY_TIMELINE = [
  {
    year: "The Problem",
    body: "Traditional B2B networking was broken — loud, untargeted, and conference-hall-dependent. Organisations struggled to find the right partners.",
    active: true,
  },
  {
    year: "The Vision",
    body: "We built CorpConnect as a B2B Networking Graph: Organizations ↔ Members ↔ Events ↔ Connections ↔ AI Recommendations — not another event ticketing clone.",
    active: false,
  },
  {
    year: "Today",
    body: "A living ecosystem where AI matchmaking, industry groups, hosted events, and organisation profiles converge into one precision-engineered platform.",
    active: false,
  },
];

const PILLARS = [
  {
    icon: <Building2 className="w-6 h-6" />,
    title: "Organisation-First Profiles",
    body: "Every entity on CorpConnect is an organisation, not just an individual. Profiles capture industry, services, technologies, hiring intent, and partnership history — the data that actually drives B2B decisions.",
  },
  {
    icon: <BrainCircuit className="w-6 h-6" />,
    title: "AI-Powered Matchmaking",
    body: "Our AI engine analyses industry alignment, partnership history, and event co-attendance to surface organisations you should meet before you even know you need to.",
  },
  {
    icon: <CalendarDays className="w-6 h-6" />,
    title: "Events as a Catalyst",
    body: "Events are not the product — they are the accelerant. Organisations host targeted summits, workshops, and private sessions that transform connections into collaborations.",
  },
  {
    icon: <UsersRound className="w-6 h-6" />,
    title: "Industry Group Hubs",
    body: "Sector-specific communities where organisations share insights, co-author initiatives, and form consortiums. Groups self-organise around shared industry challenges.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Automation & Workflows",
    body: "Built-in automation rules let organisation admins trigger custom n8n workflows on platform events — from new member welcome sequences to partnership proposal routing.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Verified & Secure",
    body: "Organisation verification, role-based access control, and HMAC-signed webhooks ensure that every entity and integration on the platform is trusted and auditable.",
  },
];

/* ─── Page ─────────────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <div className="bg-nx-surface text-nx-on-surface">

      {/* ══ 1. HERO ══════════════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-20 md:py-28 flex flex-col md:flex-row gap-12 lg:gap-20 items-center max-w-7xl mx-auto">
        {/* Left copy */}
        <div className="w-full md:w-1/2 space-y-6">
          <p className="text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs">
            About CorpConnect
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-extrabold tracking-tight text-nx-primary leading-[1.06]">
            The B2B{" "}
            <span className="text-nx-on-tertiary-container">
              Networking Graph.
            </span>
          </h1>
          <p className="text-xl text-nx-secondary max-w-lg leading-relaxed font-body">
            CorpConnect is not an event platform. It&apos;s a living ecosystem
            where organisations discover each other, forge strategic alliances,
            and grow through AI-powered relationship intelligence.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild className="bg-nx-primary text-white px-8 py-6 rounded-xl font-headline font-bold hover:opacity-90 transition-all">
              <Link href="/sign-up">Join the Network</Link>
            </Button>
            <Button asChild variant="outline" className="border-nx-surface-variant text-nx-on-surface px-8 py-6 rounded-xl font-headline font-bold hover:bg-nx-surface-container-high transition-all">
              <Link href="/organizations/discover">Discover Organisations</Link>
            </Button>
          </div>
        </div>

        {/* Right image */}
        <div className="w-full md:w-1/2 relative h-[400px] md:h-[520px] rounded-3xl overflow-hidden bg-nx-surface-container-low">
          <Image
            src="/assets/images/about_hero.png"
            alt="Modern corporate boardroom"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nx-primary/40 to-transparent" />
        </div>
      </section>

      {/* ══ 2. MISSION / VISION BENTO ════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-20 bg-nx-surface-container-low">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* Mission — wide card */}
          <div className="md:col-span-8 bg-nx-surface-container-lowest p-10 md:p-14 rounded-[2rem] shadow-sm flex flex-col justify-between gap-8">
            <div>
              <span className="material-symbols-outlined text-4xl text-nx-on-tertiary-container mb-6 block">
                hub
              </span>
              <h2 className="text-3xl font-headline font-bold text-nx-primary mb-4">
                Our Mission
              </h2>
              <p className="text-lg text-nx-secondary leading-relaxed max-w-2xl font-body">
                To build the definitive infrastructure for B2B relationship
                intelligence — a platform where organisations don&apos;t just
                attend events but discover strategic partners, collaborate on
                initiatives, and grow their network with the precision of a
                curated executive suite. Events are the catalyst, not the product.
              </p>
            </div>
            <div className="flex gap-4 flex-wrap">
              {["Organisation Discovery", "AI Matchmaking", "Strategic Events", "Industry Groups"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-nx-surface-container text-nx-on-surface-variant text-xs font-label font-semibold rounded-full uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Vision — narrow dark card */}
          <div className="md:col-span-4 bg-nx-primary text-white p-10 md:p-12 rounded-[2rem] flex flex-col justify-end relative overflow-hidden min-h-[260px]">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Network className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-headline font-bold mb-3">
                Organisation-First
              </h3>
              <p className="text-nx-on-primary-container text-sm leading-relaxed">
                Every feature is designed around organisations and their
                relationships — not individual social feeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 3. OUR STORY — Asymmetric editorial ═════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-24 md:py-32 flex flex-col md:flex-row gap-16 md:gap-20 max-w-7xl mx-auto">
        {/* Sticky left column */}
        <div className="md:w-5/12 md:sticky md:top-24 h-fit">
          <h2 className="text-4xl font-headline font-bold text-nx-primary mb-10">
            Our Story
          </h2>
          <div className="space-y-7">
            {STORY_TIMELINE.map((item) => (
              <div
                key={item.year}
                className={`border-l-4 pl-6 transition-colors ${item.active
                    ? "border-nx-on-tertiary-container"
                    : "border-nx-surface-variant"
                  }`}
              >
                <p className="text-nx-on-surface font-headline font-bold mb-1">
                  {item.year}
                </p>
                <p className="text-nx-secondary text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable right column */}
        <div className="md:w-7/12 text-lg text-nx-secondary space-y-8 leading-relaxed font-body">
          <p>
            CorpConnect was built from a simple observation: the world&apos;s most
            important B2B relationships were still being forged through chance
            encounters at conferences and cold LinkedIn requests. There was no
            structured, intelligent infrastructure for{" "}
            <span className="text-nx-primary font-semibold">
              organisation-to-organisation discovery
            </span>.
          </p>
          <div className="relative h-[360px] rounded-2xl overflow-hidden">
            <Image
              src="/assets/images/about_story.png"
              alt="Modern skyscraper symbolising structure and ambition"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </div>
          <p>
            We built CorpConnect around a{" "}
            <span className="text-nx-primary font-semibold">
              B2B Networking Graph
            </span>{" "}
            — connecting Organisations → Members → Events → Connections →
            Recommendations in a single, coherent ecosystem. AI-powered matching
            surfaces the right partners. Industry groups foster ongoing
            collaboration. Events act as catalysts that convert digital connections
            into real business relationships.
          </p>
          <p>
            Today, CorpConnect operates across 40+ countries. Our platform
            supports organisation verification, AI matchmaking, multi-organisation
            membership contexts, custom automation workflows, and a full events
            infrastructure — all designed to serve the modern B2B decision-maker.
          </p>
        </div>
      </section>

      {/* ══ 4. PLATFORM PILLARS ══════════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-20 bg-nx-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs mb-4">
              What We Built
            </p>
            <h2 className="text-4xl font-headline font-bold text-nx-primary">
              The Six Pillars of CorpConnect
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="group p-8 rounded-2xl bg-nx-surface-container-low hover:bg-nx-surface-container transition-colors duration-200"
              >
                <div className="w-12 h-12 bg-nx-tertiary-fixed rounded-xl flex items-center justify-center mb-6 text-nx-on-tertiary-container group-hover:bg-nx-on-tertiary-container group-hover:text-white transition-colors duration-200">
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-headline font-bold text-nx-primary mb-3">
                  {pillar.title}
                </h3>
                <p className="text-nx-secondary text-sm leading-relaxed font-body">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5. GLOBAL PRESENCE ═══════════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-20 bg-nx-surface-container-low overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16">
          {/* Copy */}
          <div className="md:w-1/2 space-y-8">
            <h2 className="text-4xl font-headline font-bold text-nx-primary">
              Built for Global Scale
            </h2>
            <p className="text-lg text-nx-secondary leading-relaxed font-body">
              From startup ecosystems in Bangalore to enterprise networks in
              Frankfurt and Singapore — CorpConnect&apos;s infrastructure supports
              multi-regional organisation discovery, timezone-aware event
              scheduling, and cross-border partnership proposals at any scale.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="p-6 bg-nx-surface-container-lowest rounded-xl"
                >
                  <p className="text-3xl font-headline font-extrabold text-nx-on-tertiary-container">
                    {s.value}
                  </p>
                  <p className="text-xs text-nx-secondary font-label uppercase tracking-wider mt-1">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative network vis */}
          <div className="md:w-1/2 h-[400px] w-full rounded-3xl overflow-hidden relative bg-nx-primary-container flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Network className="w-[360px] h-[360px] text-white" />
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-4 p-8 w-full">
              {["London", "Singapore", "New York", "Bangalore", "Dubai", "Frankfurt"].map((city) => (
                <div
                  key={city}
                  className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-2 border border-white/10"
                >
                  <div className="w-2 h-2 rounded-full bg-nx-on-tertiary-container animate-pulse" />
                  <span className="text-white text-sm font-label font-semibold">{city}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 6. FINAL CTA ═════════════════════════════════════════════════ */}
      <section className="px-6 md:px-16 lg:px-24 py-24 text-center">
        <div className="max-w-3xl mx-auto bg-nx-primary py-16 px-8 md:px-16 rounded-[3rem] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-nx-on-tertiary-container opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-6 leading-tight">
              Experience the Network.
            </h2>
            <p className="text-nx-on-primary-container text-lg mb-10 leading-relaxed">
              Join a curated ecosystem of verified organisations, AI-matched
              partners, and world-class industry events. Your next strategic
              alliance is already on CorpConnect.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild className="bg-nx-on-tertiary-container text-nx-primary px-10 py-6 rounded-xl font-headline font-bold hover:bg-white transition-all shadow-xl">
                <Link href="/sign-up">Apply for Membership</Link>
              </Button>
              <Button asChild variant="outline" className="border border-white/30 text-white px-10 py-6 rounded-xl font-headline font-bold hover:bg-white/10 transition-all bg-transparent outline-none">
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
