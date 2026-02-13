'use client';

import { redirect, notFound } from "next/navigation";
import axios from "axios";
import OrganizationHeader from "@/components/shared/OrganizationHeader";
import MemberCard from "@/components/shared/MemberCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Edit, Users, Calendar, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import React from "react";

interface OrganizationProfilePageProps {
    params: Promise<{
        id: string;
    }>;
}

const OrganizationProfilePage = ({ params }: OrganizationProfilePageProps) => {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const [organization, setOrganization] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    console.log("userId", session);
    console.log("session status", status);

    const unwrappedParams = React.use(params);
    const id = unwrappedParams.id;

    useEffect(() => {
        if (status === "loading") return;

        const fetchOrganization = async () => {
            try {
                setLoading(true);
                const response = await axios.get(
                    `/api/organizations/${id}`,
                );

                if (response.status !== 200) {
                    notFound();
                }

                setOrganization(response.data);
            } catch (error) {
                console.error("Error fetching organization:", error);
                notFound();
            } finally {
                setLoading(false);
            }
        };
        fetchOrganization();
    }, [id, status]);

    if (status === "loading" || loading || !organization) {
        return (
            <div className="wrapper py-8">
                <div className="flex justify-center items-center min-h-[400px]">
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") {
        redirect("/login");
    }

    const currentUserMembership = organization.members.find(
        (m: any) => m.userId === userId
    );

    const canEdit = currentUserMembership && ["OWNER", "ADMIN"].includes(currentUserMembership.role);
    const canManageMembers = currentUserMembership && currentUserMembership.role === "OWNER";

    return (
        <div className="wrapper py-8">
            <div className="flex flex-col gap-6">
                {/* Organization Header */}
                <OrganizationHeader organization={organization}>
                    {canEdit && (
                        <Link href={`/organizations/${id}/edit`}>
                            <Button variant="outline" className="gap-2">
                                <Edit className="w-4 h-4" />
                                Edit
                            </Button>
                        </Link>
                    )}
                    {canManageMembers && (
                        <Link href={`/organizations/${id}/members`}>
                            <Button className="gap-2">
                                <Users className="w-4 h-4" />
                                Manage Members
                            </Button>
                        </Link>
                    )}
                </OrganizationHeader>

                {/* About Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {organization.description ? (
                            <p className="text-gray-700">{organization.description}</p>
                        ) : (
                            <p className="text-gray-500 italic">No description provided</p>
                        )}

                        {organization.website && (
                            <div className="flex items-center gap-2 text-sm">
                                <ExternalLink className="w-4 h-4 text-gray-500" />
                                <a
                                    href={organization.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {organization.website}
                                </a>
                            </div>
                        )}

                        <div className="flex gap-6 text-sm text-gray-600">
                            <div>
                                <span className="font-semibold">{organization._count.members}</span> Members
                            </div>
                            <div>
                                <span className="font-semibold">{organization._count.events}</span> Events Hosted
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Members Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Members ({organization.members.length})</CardTitle>
                        <CardDescription>People in this organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {organization.members.slice(0, 5).map((member: any) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    showActions={false}
                                />
                            ))}
                            {organization.members.length > 5 && (
                                <div className="text-center pt-4">
                                    <Link href={`/organizations/${id}/members`}>
                                        <Button variant="outline">
                                            View All {organization.members.length} Members
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Hosted Events Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hosted Events ({organization._count.events})</CardTitle>
                        <CardDescription>Events organized by this organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {organization.events.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {organization.events.map((event: any) => (
                                    <Link
                                        key={event.id}
                                        href={`/events/${event.id}`}
                                        className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        {event.image && (
                                            <div className="relative h-40 w-full">
                                                <Image
                                                    src={event.image}
                                                    alt={event.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <h3 className="font-semibold mb-1">{event.title}</h3>
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {event.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(event.startDateTime).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No events hosted yet</p>
                                {canEdit && (
                                    <Link href="/events/create">
                                        <Button className="mt-4">Create First Event</Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OrganizationProfilePage;
