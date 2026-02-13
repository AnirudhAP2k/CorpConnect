"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MemberCard from "@/components/shared/MemberCard";
import MemberInviteForm from "@/components/shared/MemberInviteForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";

interface MembersManagementClientProps {
    organizationId: string;
    initialMembers: any[];
    currentUserRole: string;
}

const MembersManagementClient = ({
    organizationId,
    initialMembers,
    currentUserRole,
}: MembersManagementClientProps) => {
    const router = useRouter();
    const [members, setMembers] = useState(initialMembers);
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemoveMember = async (memberId: string) => {
        setMemberToRemove(memberId);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;

        setIsRemoving(true);
        try {
            await axios.delete(
                `/api/organizations/${organizationId}/members/${memberToRemove}`
            );

            setMembers(members.filter((m) => m.id !== memberToRemove));
            setMemberToRemove(null);
            router.refresh();
        } catch (error: any) {
            const errMessage = error.response?.data?.error || "Failed to remove member";
            alert(errMessage);
        } finally {
            setIsRemoving(false);
        }
    };

    const handleChangeRole = async (memberId: string, newRole: string) => {
        try {
            await axios.put(
                `/api/organizations/${organizationId}/members/${memberId}`,
                { role: newRole }
            );

            setMembers(
                members.map((m) =>
                    m.id === memberId ? { ...m, role: newRole } : m
                )
            );
            router.refresh();
        } catch (error: any) {
            const errMessage = error.response?.data?.error || "Failed to change role";
            alert(errMessage);
        }
    };

    const handleInviteSuccess = () => {
        router.refresh();
    };

    return (
        <div className="wrapper py-8">
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={`/organizations/${organizationId}`}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Profile
                        </Button>
                    </Link>
                    <h1 className="h2-bold">Manage Members</h1>
                </div>

                {/* Invite Member Form */}
                {currentUserRole === "OWNER" && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Invite New Member</CardTitle>
                            <CardDescription>
                                Add a new member to your organization by email
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MemberInviteForm
                                organizationId={organizationId}
                                onSuccess={handleInviteSuccess}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Members List */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Members ({members.length})</CardTitle>
                        <CardDescription>
                            Manage roles and remove members from your organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {members.map((member) => (
                                <MemberCard
                                    key={member.id}
                                    member={member}
                                    currentUserRole={currentUserRole}
                                    onRemove={handleRemoveMember}
                                    onChangeRole={handleChangeRole}
                                    showActions={true}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Remove Confirmation Dialog */}
            <AlertDialog
                open={!!memberToRemove}
                onOpenChange={() => setMemberToRemove(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the member from your organization. They will lose
                            access to all organization resources. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRemoveMember}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isRemoving ? "Removing..." : "Remove Member"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MembersManagementClient;
