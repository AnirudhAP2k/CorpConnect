import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    MapPin,
    Building2,
    CheckCircle,
    CalendarDays,
    Globe,
    Linkedin,
    Twitter,
    Users,
    Mic,
    Clock,
    Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSharedProfile } from "@/domain/users";
import { decodeProfileToken } from "@/lib/profile-link";
import { format } from "date-fns";
import type { Metadata } from "next";

type PublicProfilePageProps = {
    params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
    const { token } = await params;
    const userId = decodeProfileToken(token);
    const profile = userId ? await getSharedProfile(userId) : null;

    if (!profile) return { title: "Profile not found | CorpConnect" };

    const name = profile.name ?? "CorpConnect member";

    return {
        title: `${name} | CorpConnect`,
        description: profile.headline ?? `${name} on CorpConnect.`,
        openGraph: {
            title: name,
            description: profile.headline ?? `${name} on CorpConnect.`,
            images: profile.image ? [profile.image] : undefined,
        },
    };
}

function SectionCard({ title, icon, children }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-3xl bg-white p-6 shadow-nx-card">
            <h2 className="mb-5 flex items-center gap-2 font-headline text-base font-semibold text-nx-primary">
                <span className="text-nx-on-tertiary-container">{icon}</span>
                {title}
            </h2>
            {children}
        </section>
    );
}

function SocialLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl bg-nx-surface-container-low px-4 py-3 text-sm font-body text-nx-on-surface transition-colors hover:bg-nx-surface-container"
        >
            <span className="shrink-0 text-nx-on-tertiary-container">{icon}</span>
            <span className="truncate">{label}</span>
        </a>
    );
}

function Tag({ label }: { label: string }) {
    return (
        <span className="rounded-lg border border-nx-surface-container-high bg-white px-3 py-1.5 text-xs font-label font-semibold text-nx-primary shadow-nx-card">
            {label}
        </span>
    );
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
    const { token } = await params;
    const userId = decodeProfileToken(token);
    if (!userId) notFound();

    const profile = await getSharedProfile(userId);
    if (!profile) notFound();

    const fullName = profile.name ?? "CorpConnect member";
    const initials = fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    const organization = profile.organization;
    const headline = profile.headline
        ?? (organization ? `Member · ${organization.name}` : "Professional member");
    const location = profile.location ?? organization?.location;
    const hasLinks = Boolean(profile.linkedinUrl || profile.websiteUrl || profile.twitterUrl);

    const stats = [
        { label: "Events hosted", value: profile.eventsHosted },
        { label: "Events attended", value: profile.eventsAttended },
        { label: "Organizations", value: profile.organizationMemberships.length },
        { label: "Communities", value: profile.groupsCreated.length },
    ].filter((stat) => stat.value !== 0);

    const expertise = [
        organization?.industry?.label,
        ...(organization?.services ?? []).slice(0, 4),
        ...(organization?.technologies ?? []).slice(0, 4),
        ...(organization?.partnershipInterests ?? []).slice(0, 3),
    ].filter((tag): tag is string => Boolean(tag));

    return (
        <div className="min-h-screen bg-nx-background px-6 py-12 md:px-10">
            <div className="mx-auto flex max-w-4xl flex-col gap-6">

                {/* ── Hero ── */}
                <section className="rounded-3xl bg-white p-8 shadow-nx-card">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-nx-surface-container-high">
                            {profile.image ? (
                                <Image
                                    src={profile.image}
                                    alt={fullName}
                                    fill
                                    className="object-cover"
                                    sizes="112px"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-nx-cta-gradient">
                                    <span className="font-headline text-3xl font-bold text-white">
                                        {initials}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            {organization?.industry?.label && (
                                <span className="text-[10px] font-label font-semibold uppercase tracking-[0.08em] text-nx-on-tertiary-container">
                                    {organization.industry.label}
                                </span>
                            )}
                            <h1 className="font-headline text-3xl font-bold tracking-tight text-nx-primary">
                                {fullName}
                            </h1>
                            <p className="mt-1 font-body text-nx-on-surface-variant">{headline}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-nx-on-surface-variant">
                                {location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {location}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" />
                                    Member since {format(new Date(profile.createdAt), "MMM yyyy")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {profile.bio && (
                        <p className="mt-8 whitespace-pre-line font-body leading-relaxed text-nx-on-surface">
                            {profile.bio}
                        </p>
                    )}

                    {stats.length > 0 && (
                        <div className="mt-8 flex flex-wrap gap-8 border-t border-nx-surface-container-high pt-6">
                            {stats.map((stat) => (
                                <div key={stat.label} className="flex flex-col">
                                    <span className="font-headline text-2xl font-bold text-nx-primary">
                                        {stat.value}
                                    </span>
                                    <span className="text-[11px] font-label uppercase tracking-widest text-nx-on-surface-variant">
                                        {stat.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasLinks && (
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {profile.linkedinUrl && (
                                <SocialLink
                                    icon={<Linkedin className="h-4 w-4" />}
                                    label="LinkedIn"
                                    href={profile.linkedinUrl}
                                />
                            )}
                            {profile.websiteUrl && (
                                <SocialLink
                                    icon={<Globe className="h-4 w-4" />}
                                    label={profile.websiteUrl.replace(/^https?:\/\//, "")}
                                    href={profile.websiteUrl}
                                />
                            )}
                            {profile.twitterUrl && (
                                <SocialLink
                                    icon={<Twitter className="h-4 w-4" />}
                                    label="X / Twitter"
                                    href={profile.twitterUrl}
                                />
                            )}
                        </div>
                    )}
                </section>

                {/* ── Organizations ── */}
                {profile.organizationMemberships.length > 0 && (
                    <SectionCard title="Organizations" icon={<Building2 className="h-4 w-4" />}>
                        <div className="space-y-4">
                            {profile.organizationMemberships.map((membership) => (
                                <div key={membership.id} className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-nx-surface-container-low">
                                        {membership.organization.logo ? (
                                            <Image
                                                src={membership.organization.logo}
                                                alt={membership.organization.name}
                                                width={32}
                                                height={32}
                                                className="rounded-lg object-cover"
                                            />
                                        ) : (
                                            <Building2 className="h-5 w-5 text-nx-primary" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/organizations/${membership.organization.id}`}
                                                className="font-headline text-sm font-semibold text-nx-primary hover:underline"
                                            >
                                                {membership.organization.name}
                                            </Link>
                                            {membership.organization.isVerified && (
                                                <Badge className="border-0 bg-green-50 text-[10px] text-green-700">
                                                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="mt-0.5 text-xs text-nx-on-surface-variant">
                                            {membership.role.replace("_", " ")}
                                            {membership.organization.industry?.label &&
                                                ` · ${membership.organization.industry.label}`}
                                            {membership.organization.location &&
                                                ` · ${membership.organization.location}`}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[11px] font-label uppercase tracking-widest text-nx-on-surface-variant">
                                        Since {format(new Date(membership.createdAt), "yyyy")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* ── Hosting ── */}
                {profile.hostedEvents.length > 0 && (
                    <SectionCard title="Hosting next" icon={<Mic className="h-4 w-4" />}>
                        <div className="space-y-3">
                            {profile.hostedEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
                                    className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-nx-surface-container-low"
                                >
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nx-primary/10">
                                        <CalendarDays className="h-5 w-5 text-nx-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-headline text-sm font-semibold text-nx-primary group-hover:underline">
                                            {event.title}
                                        </p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-nx-on-surface-variant">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(event.startDateTime), "MMM d, yyyy · h:mm a")}
                                            </span>
                                            {event.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* ── Recently attended ── */}
                {profile.recentPublicEvents.length > 0 && (
                    <SectionCard title="Recently attended" icon={<Users className="h-4 w-4" />}>
                        <div className="space-y-3">
                            {profile.recentPublicEvents.map((participation) => (
                                <Link
                                    key={participation.id}
                                    href={`/events/${participation.event.id}`}
                                    className="group flex items-center justify-between gap-4 rounded-xl bg-nx-surface-container-low p-3"
                                >
                                    <span className="truncate font-body text-sm text-nx-on-surface group-hover:underline">
                                        {participation.event.title}
                                    </span>
                                    <span className="shrink-0 text-xs text-nx-on-surface-variant">
                                        {format(new Date(participation.event.startDateTime), "MMM yyyy")}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* ── Communities ── */}
                {profile.groupsCreated.length > 0 && (
                    <SectionCard title="Communities founded" icon={<Layers className="h-4 w-4" />}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {profile.groupsCreated.map((group) => (
                                <div
                                    key={group.id}
                                    className="rounded-xl bg-nx-surface-container-low p-4"
                                >
                                    <p className="font-headline text-sm font-semibold text-nx-primary">
                                        {group.name}
                                    </p>
                                    <p className="mt-1 text-xs text-nx-on-surface-variant">
                                        {group.industry.label} · {group._count.members} member
                                        {group._count.members === 1 ? "" : "s"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* ── Expertise ── */}
                {expertise.length > 0 && (
                    <SectionCard title="Focus areas" icon={<Globe className="h-4 w-4" />}>
                        <div className="flex flex-wrap gap-2">
                            {expertise.map((tag) => (
                                <Tag key={tag} label={tag} />
                            ))}
                        </div>
                    </SectionCard>
                )}

                <div className="mt-2 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-nx-on-surface-variant">
                        Meet {fullName.split(" ")[0]} and thousands of other professionals on CorpConnect.
                    </p>
                    <Button asChild className="rounded-xl">
                        <Link href="/events">Browse events</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
