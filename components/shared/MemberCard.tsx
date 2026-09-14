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

const ROLE_BADGE_STYLES: Record<string, string> = {
	OWNER:
		"bg-nx-warning-container text-nx-on-warning-container border-nx-warning/20",
	ADMIN:
		"bg-nx-secondary-container text-nx-on-secondary-container border-nx-secondary/20",
	MEMBER:
		"bg-nx-surface-container-high text-nx-on-surface-variant border-nx-outline-variant",
};

const MemberCard = ({
	member,
	currentUserRole,
	onRemove,
	onChangeRole,
	showActions = false,
}: MemberCardProps) => {
	const roleBadgeStyle =
		ROLE_BADGE_STYLES[member.role] ??
		"bg-nx-primary-container text-nx-on-primary-container border-nx-primary/20";

	const canManageMember =
		showActions && currentUserRole === "OWNER" && member.role !== "OWNER";

	return (
		<div className="flex flex-col items-stretch gap-3 p-4 bg-nx-surface-container-lowest rounded-xl border border-nx-outline-variant/60 hover:shadow-sm transition-shadow sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 items-center gap-4">
				{/* Avatar */}
				<div className="w-12 h-12 rounded-full overflow-hidden bg-nx-surface-container-high flex flex-shrink-0 items-center justify-center">
					{member.user.image ? (
						<Image
							src={member.user.image}
							alt={member.user.name || "User"}
							width={48}
							height={48}
							className="object-cover w-full h-full"
						/>
					) : (
						<span className="text-lg font-headline font-semibold text-nx-on-surface-variant">
							{member.user.name?.charAt(0).toUpperCase() || "?"}
						</span>
					)}
				</div>

				{/* Member Info */}
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="font-headline font-semibold text-nx-on-surface">
							{member.user.name || "Unknown"}
						</h3>
						<Badge variant="outline" className={`shrink-0 ${roleBadgeStyle}`}>
							{member.role}
						</Badge>
					</div>
					<div className="flex items-center gap-2 text-sm text-nx-on-surface-variant flex-wrap">
						{member.user.email && (
							<span className="break-all">{member.user.email}</span>
						)}
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
						<Button
							variant="ghost"
							size="sm"
							className="shrink-0 text-nx-on-surface-variant"
						>
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
								className="text-nx-error focus:text-nx-error"
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
