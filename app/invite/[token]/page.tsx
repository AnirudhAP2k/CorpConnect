import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";

interface InvitePageProps {
    params: {
        token: string;
    };
}

const InvitePage = async ({ params }: InvitePageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch invite by token
    const invite = await prisma.pendingInvite.findUnique({
        where: { token: params.token },
        include: {
            organization: true,
            inviter: true,
        },
    });

    // Check if invite exists
    if (!invite) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Invalid Invitation</CardTitle>
                        <CardDescription className="text-center">
                            This invitation link is invalid or has been removed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/dashboard">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if invite is expired
    if (invite.expiresAt < new Date()) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <Clock className="w-16 h-16 text-orange-500" />
                        </div>
                        <CardTitle className="text-center">Invitation Expired</CardTitle>
                        <CardDescription className="text-center">
                            This invitation has expired. Please contact the organization admin for a new invitation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            Organization: <strong>{invite.organization.name}</strong>
                        </p>
                        <Link href="/dashboard">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if invite is already accepted
    if (invite.status === "ACCEPTED") {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <CardTitle className="text-center">Already Accepted</CardTitle>
                        <CardDescription className="text-center">
                            You have already accepted this invitation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href={`/organizations/${invite.organizationId}`}>
                            <Button>View Organization</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // User must be logged in to accept invite
    if (!userId) {
        // Redirect to login with return URL
        redirect(`/login?callbackUrl=/invite/${params.token}`);
    }

    // Check if user's email matches the invite
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (user?.email !== invite.email) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Email Mismatch</CardTitle>
                        <CardDescription className="text-center">
                            This invitation was sent to <strong>{invite.email}</strong>, but you are logged in as <strong>{user?.email}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            Please log in with the correct email address or contact the organization admin.
                        </p>
                        <Link href="/login">
                            <Button>Switch Account</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if user already belongs to another organization
    const existingMembership = await prisma.organizationMember.findFirst({
        where: { userId },
    });

    if (existingMembership) {
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Already in Organization</CardTitle>
                        <CardDescription className="text-center">
                            You already belong to another organization. Users can only belong to one organization at a time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/dashboard">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Accept the invitation
    try {
        await prisma.$transaction(async (tx) => {
            // Add user to organization
            await tx.organizationMember.create({
                data: {
                    userId,
                    organizationId: invite.organizationId,
                    role: invite.role,
                },
            });

            // Update user's organizationId
            await tx.user.update({
                where: { id: userId },
                data: { organizationId: invite.organizationId },
            });

            // Mark invite as accepted
            await tx.pendingInvite.update({
                where: { id: invite.id },
                data: { status: "ACCEPTED" },
            });
        });

        // Success! Redirect to organization page
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                        </div>
                        <CardTitle className="text-center">Welcome!</CardTitle>
                        <CardDescription className="text-center">
                            You have successfully joined <strong>{invite.organization.name}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                            You are now a <strong>{invite.role}</strong> of this organization.
                        </p>
                        <Link href={`/organizations/${invite.organizationId}`}>
                            <Button>View Organization</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    } catch (error) {
        console.error("Error accepting invite:", error);
        return (
            <div className="wrapper min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <XCircle className="w-16 h-16 text-red-500" />
                        </div>
                        <CardTitle className="text-center">Error</CardTitle>
                        <CardDescription className="text-center">
                            Something went wrong while accepting the invitation. Please try again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/dashboard">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
};

export default InvitePage;
