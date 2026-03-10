"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, UserPlus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

interface JoinLeaveGroupButtonProps {
    groupId: string;
    isMember: boolean;
    isAdmin: boolean;
}

export default function JoinLeaveGroupButton({ groupId, isMember, isAdmin }: JoinLeaveGroupButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleToggleJoin() {
        if (!isAdmin) {
            toast.error("You must be an Owner or Admin of your organization to join or leave groups.");
            return;
        }

        setIsLoading(true);
        try {
            if (isMember) {
                await axios.delete(`/api/groups/${groupId}/members`);
                toast.success("Left Group: Your organization is no longer a member of this group.");
            } else {
                await axios.post(`/api/groups/${groupId}/members`);
                toast.success("Joined Group: Your organization is now a member of this group.");
            }
            router.refresh();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to update membership status");
        } finally {
            setIsLoading(false);
        }
    }

    if (isMember) {
        return (
            <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleToggleJoin} disabled={isLoading || !isAdmin}>
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
            </Button>
        );
    }

    return (
        <Button onClick={handleToggleJoin} disabled={isLoading || !isAdmin} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Join Industry Group
        </Button>
    );
}
