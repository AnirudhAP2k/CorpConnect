import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, UserMinus, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemberCardProps {
    member: {
        id: string;
        role: string;
        createdAt: Date;
        user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
        };
    };
    currentUserRole?: string;
    onRemove?: (memberId: string) => void;
    onChangeRole?: (memberId: string, newRole: string) => void;
    showActions?: boolean;
}

const MemberCard = ({
    member,
    currentUserRole,
    onRemove,
    onChangeRole,
    showActions = false,
}: MemberCardProps) => {
    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case "OWNER":
                return "owner";
            case "ADMIN":
                return "admin";
            case "MEMBER":
                return "member";
            default:
                return "default";
        }
    };

    const canManageMember =
        showActions &&
        currentUserRole === "OWNER" &&
        member.role !== "OWNER";

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {member.user.image ? (
                        <Image
                            src={member.user.image}
                            alt={member.user.name || "User"}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <span className="text-lg font-semibold text-gray-600">
                            {member.user.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                    )}
                </div>

                {/* Member Info */}
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{member.user.name || "Unknown"}</h3>
                        <Badge variant={getRoleBadgeVariant(member.role) as any}>
                            {member.role}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        {member.user.email && <span>{member.user.email}</span>}
                        <span>•</span>
                        <span>
                            Joined {formatDistanceToNow(new Date(member.createdAt))} ago
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            {canManageMember && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {member.role === "MEMBER" && onChangeRole && (
                            <DropdownMenuItem
                                onClick={() => onChangeRole(member.id, "ADMIN")}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Make Admin
                            </DropdownMenuItem>
                        )}
                        {member.role === "ADMIN" && onChangeRole && (
                            <DropdownMenuItem
                                onClick={() => onChangeRole(member.id, "MEMBER")}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Make Member
                            </DropdownMenuItem>
                        )}
                        {onRemove && (
                            <DropdownMenuItem
                                onClick={() => onRemove(member.id)}
                                className="text-red-600"
                            >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove Member
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
};

export default MemberCard;
