import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, Mail, User, Check, X } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

const InvitationsPage = async () => {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId || !userEmail) {
        redirect("/login?callbackUrl=/invitations");
    }

    // Fetch pending invitations
    const invitations = await prisma.pendingInvite.findMany({
        where: {
            email: userEmail,
            status: "PENDING",
            expiresAt: {
                gte: new Date(), // Only show non-expired
            },
        },
        include: {
            organization: true,
            inviter: {
                select: {
                    name: true,
                    email: true,
                    image: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const getRoleBadge = (role: string) => {
        const colors = {
            OWNER: "bg-purple-100 text-purple-700",
            ADMIN: "bg-blue-100 text-blue-700",
            MEMBER: "bg-gray-100 text-gray-700",
        };
        return colors[role as keyof typeof colors] || colors.MEMBER;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-10 md:py-16">
                <div className="wrapper">
                    <h1 className="h1-bold">Organization Invitations</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your pending organization invitations
                    </p>
                </div>
            </section>

            {/* Content */}
            <div className="wrapper my-8">
                {invitations.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No Pending Invitations
                        </h3>
                        <p className="text-gray-600">
                            You don't have any pending organization invitations at the moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invitations.map((invitation) => (
                            <InvitationCard
                                key={invitation.id}
                                invitation={invitation}
                                getRoleBadge={getRoleBadge}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Client component for invitation actions
function InvitationCard({ invitation, getRoleBadge }: any) {
    const handleAccept = async () => {
        try {
            const response = await axios.post(
                `/api/invitations/${invitation.id}/accept`
            );
            window.location.href = `/organizations/${response.data.organizationId}`;
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to accept invitation");
        }
    };

    const handleDecline = async () => {
        if (!confirm("Are you sure you want to decline this invitation?")) {
            return;
        }

        try {
            await axios.post(`/api/invitations/${invitation.id}/decline`);
            window.location.reload();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to decline invitation");
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left side - Organization info */}
                <div className="flex-1">
                    <div className="flex items-start gap-4">
                        {invitation.organization.logo ? (
                            <img
                                src={invitation.organization.logo}
                                alt={invitation.organization.name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-primary-600" />
                            </div>
                        )}

                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {invitation.organization.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge className={getRoleBadge(invitation.role)}>
                                    {invitation.role}
                                </Badge>
                                {invitation.organization.isVerified && (
                                    <Badge className="bg-green-100 text-green-700">
                                        ✓ Verified
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <span>
                                        Invited by {invitation.inviter.name || invitation.inviter.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                        Sent {format(new Date(invitation.createdAt), "MMM dd, yyyy")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-orange-600">
                                        Expires {format(new Date(invitation.expiresAt), "MMM dd, yyyy")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex flex-col gap-2 md:w-48">
                    <Button
                        onClick={handleAccept}
                        className="gap-2 w-full"
                        size="lg"
                    >
                        <Check className="w-4 h-4" />
                        Accept
                    </Button>
                    <Button
                        onClick={handleDecline}
                        variant="outline"
                        className="gap-2 w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        size="lg"
                    >
                        <X className="w-4 h-4" />
                        Decline
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default InvitationsPage;
