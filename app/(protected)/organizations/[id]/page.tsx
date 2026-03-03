import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    Edit, Users, Calendar, ExternalLink, Linkedin, Twitter,
    Briefcase, Code2, Handshake, CheckCircle, Building2, MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MemberCard from "@/components/shared/MemberCard";
import type { Organization } from "@prisma/client";

// ISR — org profile is semi-static, revalidate every 60 s
export const revalidate = 60;

interface OrganizationProfilePageProps {
    params: Promise<{ id: string }>;
}

const SIZE_LABELS: Record<string, string> = {
    STARTUP: "Startup",
    SME: "SME",
    ENTERPRISE: "Enterprise",
};

const HIRING_BADGES: Record<string, { label: string; color: string }> = {
    HIRING: { label: "🟢 Actively Hiring", color: "bg-green-50 text-green-700 border-green-200" },
    NOT_HIRING: { label: "⚪ Not Hiring", color: "bg-gray-50 text-gray-600 border-gray-200" },
    OPEN_TO_PARTNERSHIPS: { label: "🤝 Open to Partnerships", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

// ─── Small chip array component ────────────────────────────────────────────────
function ChipList({ items, colorClass = "bg-primary/8 text-primary border-primary/20" }: {
    items: string[];
    colorClass?: string;
}) {
    if (!items || items.length === 0) return <p className="text-sm text-gray-400 italic">None listed</p>;
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <span key={item} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                    {item}
                </span>
            ))}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
const OrganizationProfilePage = async ({ params }: OrganizationProfilePageProps) => {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) redirect("/login");

    // Fetch org directly from DB — no unnecessary HTTP round-trip
    const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
            industry: true,
            orgTags: { include: { tag: { select: { id: true, label: true } } } },
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                },
                orderBy: { createdAt: "asc" },
            },
            events: {
                take: 6,
                orderBy: { startDateTime: "desc" },
                include: { category: true },
            },
            _count: { select: { members: true, events: true } },
        },
    });

    if (!organization) notFound();

    // Cast to include Phase 8 fields — Prisma client types are stale until
    // `prisma generate` runs (blocked while dev server holds the .dll.node lock).
    // Safe to cast: db push already applied the columns.
    const org = organization as typeof organization & {
        hiringStatus: string;
        services: string[];
        technologies: string[];
        partnershipInterests: string[];
        linkedinUrl: string | null;
        twitterUrl: string | null;
    };

    const currentUserMembership = org.members.find((m) => m.userId === userId);
    const canEdit = currentUserMembership && ["OWNER", "ADMIN"].includes(currentUserMembership.role);
    const canManageMembers = currentUserMembership?.role === "OWNER";

    const hiringBadge = HIRING_BADGES[org.hiringStatus] ?? HIRING_BADGES.NOT_HIRING;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero / header band */}
            <div className="bg-white border-b">
                <div className="wrapper py-8">
                    <div className="flex flex-col md:flex-row items-start gap-6">

                        {/* Logo */}
                        <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                            {organization.logo ? (
                                <Image src={organization.logo} alt={organization.name} fill className="object-cover" sizes="80px" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Building2 className="w-10 h-10 text-gray-300" />
                                </div>
                            )}
                        </div>

                        {/* Name + meta */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
                                {organization.isVerified && (
                                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" aria-label="Verified organization" />
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                                <span>{organization.industry.label}</span>
                                {organization.size && (
                                    <Badge variant="outline" className="text-xs">{SIZE_LABELS[organization.size]}</Badge>
                                )}
                                {organization.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />{organization.location}
                                    </span>
                                )}
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${hiringBadge.color}`}>
                                    {hiringBadge.label}
                                </span>
                            </div>

                            {/* Social / web links */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {organization.website && (
                                    <a href={organization.website} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
                                        <ExternalLink className="w-4 h-4" />{organization.website.replace(/^https?:\/\//, "")}
                                    </a>
                                )}
                                {(organization as any).linkedinUrl && (
                                    <a href={(organization as any).linkedinUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0077b5] transition-colors">
                                        <Linkedin className="w-4 h-4" />LinkedIn
                                    </a>
                                )}
                                {(organization as any).twitterUrl && (
                                    <a href={(organization as any).twitterUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1da1f2] transition-colors">
                                        <Twitter className="w-4 h-4" />Twitter / X
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {canEdit && (
                                <Link href={`/organizations/${id}/edit`}>
                                    <Button variant="outline" className="gap-2">
                                        <Edit className="w-4 h-4" />Edit
                                    </Button>
                                </Link>
                            )}
                            {canManageMembers && (
                                <Link href={`/organizations/${id}/members`}>
                                    <Button className="gap-2">
                                        <Users className="w-4 h-4" />Manage Members
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body grid */}
            <div className="wrapper py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left column */}
                    <div className="space-y-6 lg:col-span-2">

                        {/* About */}
                        <Card>
                            <CardHeader><CardTitle>About</CardTitle></CardHeader>
                            <CardContent>
                                {organization.description
                                    ? <p className="text-gray-700 leading-relaxed">{organization.description}</p>
                                    : <p className="text-gray-400 italic">No description provided</p>
                                }
                                <div className="flex gap-6 text-sm text-gray-600 mt-4 pt-4 border-t">
                                    <span><strong>{organization._count.members}</strong> Members</span>
                                    <span><strong>{organization._count.events}</strong> Events Hosted</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Services */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-gray-500" />Services Offered
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChipList items={(organization as any).services ?? []} />
                            </CardContent>
                        </Card>

                        {/* Technologies */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Code2 className="w-4 h-4 text-gray-500" />Technologies
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChipList
                                    items={(organization as any).technologies ?? []}
                                    colorClass="bg-violet-50 text-violet-700 border-violet-200"
                                />
                            </CardContent>
                        </Card>

                        {/* Partnership Interests */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Handshake className="w-4 h-4 text-gray-500" />Partnership Interests
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChipList
                                    items={(organization as any).partnershipInterests ?? []}
                                    colorClass="bg-amber-50 text-amber-700 border-amber-200"
                                />
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        {organization.orgTags.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
                                <CardContent>
                                    <ChipList
                                        items={organization.orgTags.map((t) => t.tag.label)}
                                        colorClass="bg-gray-100 text-gray-700 border-gray-200"
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Hosted Events */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Hosted Events ({organization._count.events})</CardTitle>
                                <CardDescription>Events organized by this organization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {organization.events.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {organization.events.map((event) => (
                                            <Link
                                                key={event.id}
                                                href={`/events/${event.id}`}
                                                className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                            >
                                                {event.image && (
                                                    <div className="relative h-36 w-full">
                                                        <Image src={event.image} alt={event.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
                                                    </div>
                                                )}
                                                <div className="p-4">
                                                    <h3 className="font-semibold mb-1 truncate">{event.title}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(event.startDateTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-400">No events hosted yet</p>
                                        {canEdit && (
                                            <Link href="/events/create">
                                                <Button className="mt-4" size="sm">Create First Event</Button>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        {/* Members */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Members ({organization._count.members})</CardTitle>
                                <CardDescription>People in this organization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {organization.members.slice(0, 6).map((member) => (
                                        <MemberCard key={member.id} member={member} showActions={false} />
                                    ))}
                                    {organization._count.members > 6 && (
                                        <div className="text-center pt-3">
                                            <Link href={`/organizations/${id}/members`}>
                                                <Button variant="outline" size="sm">
                                                    View All {organization._count.members} Members
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick stats */}
                        <Card>
                            <CardHeader><CardTitle>At a Glance</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Industry</span>
                                    <span className="font-medium text-gray-900">{organization.industry.label}</span>
                                </div>
                                {organization.size && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Size</span>
                                        <span className="font-medium text-gray-900">{SIZE_LABELS[organization.size]}</span>
                                    </div>
                                )}
                                {organization.location && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Location</span>
                                        <span className="font-medium text-gray-900">{organization.location}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-600">
                                    <span>Hiring</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${hiringBadge.color}`}>
                                        {hiringBadge.label}
                                    </span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Verified</span>
                                    <span className="font-medium text-gray-900">{organization.isVerified ? "✓ Yes" : "—"}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Member since</span>
                                    <span className="font-medium text-gray-900">
                                        {new Date(organization.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationProfilePage;
