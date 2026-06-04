"use client";

import Image from "next/image";
import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Crown, Shield, Users, UserMinus, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
    id: string;
    userId: string;
    orgId: string;
    role: string;
    joinedAt: string | Date;
    user?: { id: string; name: string | null; image: string | null; email: string | null } | null;
    organization?: { id: string; name: string; logo: string | null } | null;
}

interface GroupMembersPanelProps {
    groupId: string;
    members: Member[];
    currentUserId: string;
    currentUserRole: string;
    isOpen: boolean;
    onClose: () => void;
    /** Callback when invite button is clicked — opens invite modal in parent */
    onInvite?: () => void;
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    if (role === "OWNER") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                <Crown className="w-2.5 h-2.5" /> Owner
            </span>
        );
    }
    if (role === "ADMIN") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nx-primary-container/60 border border-nx-primary/20 text-nx-primary text-[10px] font-semibold">
                <Shield className="w-2.5 h-2.5" /> Admin
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nx-surface-container border border-nx-outline-variant text-nx-on-surface-variant text-[10px] font-semibold">
            Member
        </span>
    );
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
    member,
    isCurrentUser,
    canRemove,
    onRemove,
}: {
    member: Member;
    isCurrentUser: boolean;
    canRemove: boolean;
    onRemove: (userId: string) => void;
}) {
    const joinedAgo = formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true });

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-nx-surface-container/60 transition-colors group">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-nx-surface-container border border-nx-outline-variant shrink-0">
                {member.user?.image ? (
                    <Image src={member.user.image} alt={member.user.name ?? ""} width={36} height={36} className="object-cover w-full h-full" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                        {(member.user?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-nx-on-surface truncate">
                        {member.user?.name ?? "Unknown User"}
                        {isCurrentUser && (
                            <span className="ml-1 text-[10px] text-nx-on-surface-variant font-normal">(you)</span>
                        )}
                    </span>
                    <RoleBadge role={member.role} />
                </div>
                <p className="text-[11px] text-nx-on-surface-variant truncate mt-0.5">
                    {member.organization?.name ?? ""} · joined {joinedAgo}
                </p>
            </div>

            {/* Remove button — only visible on hover for authorized users */}
            {canRemove && !isCurrentUser && member.role !== "OWNER" && (
                <button
                    onClick={() => onRemove(member.userId)}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 text-nx-on-surface-variant transition-all"
                    title="Remove member"
                    aria-label={`Remove ${member.user?.name ?? "member"}`}
                >
                    <UserMinus className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

// ─── GroupMembersPanel ────────────────────────────────────────────────────────

export function GroupMembersPanel({
    groupId,
    members,
    currentUserId,
    currentUserRole,
    isOpen,
    onClose,
    onInvite,
}: GroupMembersPanelProps) {
    const [localMembers, setLocalMembers] = useState(members);
    const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

    // Sync prop changes (e.g. after invite accepted)
    useEffect(() => { setLocalMembers(members); }, [members]);

    const handleRemove = useCallback(async (userId: string) => {
        const confirmed = window.confirm("Remove this member from the group?");
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/messaging/groups/${groupId}/members/${userId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setLocalMembers((prev) => prev.filter((m) => m.userId !== userId));
            }
        } catch {
            // Silently fail — member list will re-sync on next render
        }
    }, [groupId]);

    // Sort: OWNER first, then ADMIN, then MEMBER
    const sorted = [...localMembers].sort((a, b) => {
        const order: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
    });

    if (!isOpen) return null;

    return (
        /* Slide-in panel */
        <div className="absolute top-0 right-0 h-full w-72 bg-white border-l border-nx-outline-variant shadow-lg z-20 flex flex-col">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 shrink-0 border-b border-nx-outline-variant/60 flex items-center justify-between">
                <h3 className="text-sm font-headline font-bold text-nx-on-surface flex items-center gap-2">
                    <Users className="w-4 h-4 text-nx-primary" />
                    Members
                    <span className="text-xs font-normal text-nx-on-surface-variant ml-1">
                        ({localMembers.length})
                    </span>
                </h3>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-nx-surface-container transition-colors"
                    aria-label="Close members panel"
                >
                    <X className="w-4 h-4 text-nx-on-surface-variant" />
                </button>
            </div>

            {/* Invite button */}
            {canManage && onInvite && (
                <div className="px-4 py-2 shrink-0 border-b border-nx-outline-variant/40">
                    <button
                        onClick={onInvite}
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-nx-primary border border-nx-primary/30 bg-nx-primary-container/30 hover:bg-nx-primary-container/60 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Invite to Group
                    </button>
                </div>
            )}

            {/* Members list */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {sorted.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        isCurrentUser={member.userId === currentUserId}
                        canRemove={canManage}
                        onRemove={handleRemove}
                    />
                ))}
            </div>
        </div>
    );
}
