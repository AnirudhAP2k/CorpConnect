"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Users, Search, Plus, Crown, Shield } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupSummary {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    lastMessage: {
        content: string;
        createdAt: string;
        senderUserId: string;
    } | null;
    unreadCount: number;
    updatedAt: string;
    members: Array<{
        userId: string;
        role: string;
        organization?: { id: string; name: string; logo: string | null } | null;
    }>;
}

interface GroupConversationListProps {
    groups: GroupSummary[];
    currentUserId: string;
    onCreateGroup?: () => void;
}

// ─── Group Item ───────────────────────────────────────────────────────────────

function GroupItem({
    group,
    isActive,
    currentUserId,
}: {
    group: GroupSummary;
    isActive: boolean;
    currentUserId: string;
}) {
    const myMembership = group.members.find((m) => m.userId === currentUserId);
    const isOwner = myMembership?.role === "OWNER";
    const isAdmin = myMembership?.role === "ADMIN";
    const timeAgo = group.lastMessage
        ? formatDistanceToNow(new Date(group.lastMessage.createdAt), { addSuffix: true })
        : null;

    // Stack up to 3 org logos for the group avatar
    const orgLogos = group.members
        .slice(0, 3)
        .map((m) => m.organization)
        .filter(Boolean);

    return (
        <Link
            href={`/messaging/groups/${group.id}`}
            className={cn(
                "flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                isActive
                    ? "bg-nx-primary text-white shadow-nx-primary"
                    : "hover:bg-nx-primary-container/60"
            )}
        >
            {/* Group Avatar — stacked org logos */}
            <div className="relative shrink-0 w-10 h-10">
                {orgLogos.length === 0 ? (
                    <div className="w-10 h-10 rounded-xl bg-nx-surface-container-high border border-nx-outline-variant flex items-center justify-center">
                        <Users className={cn("w-5 h-5", isActive ? "text-white" : "text-nx-on-surface-variant/50")} />
                    </div>
                ) : orgLogos.length === 1 ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-nx-surface-container border border-nx-outline-variant">
                        {orgLogos[0]!.logo ? (
                            <Image src={orgLogos[0]!.logo} alt={orgLogos[0]!.name} width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                                {orgLogos[0]!.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Stacked mini-avatars for 2–3 orgs */
                    <div className="relative w-10 h-10">
                        {orgLogos.slice(0, 2).map((org, i) => (
                            <div
                                key={org!.id}
                                className={cn(
                                    "absolute w-7 h-7 rounded-lg overflow-hidden border-2 border-white bg-nx-surface-container-high",
                                    i === 0 ? "top-0 left-0 z-10" : "bottom-0 right-0 z-20"
                                )}
                            >
                                {org!.logo ? (
                                    <Image src={org!.logo} alt={org!.name} width={28} height={28} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-nx-on-surface-variant">
                                        {org!.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Role badge */}
                {(isOwner || isAdmin) && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                        {isOwner
                            ? <Crown className="w-2.5 h-2.5 text-amber-500" />
                            : <Shield className="w-2.5 h-2.5 text-nx-primary" />
                        }
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-sm font-semibold truncate", isActive ? "text-white" : "text-nx-on-surface")}>
                        {group.name}
                    </span>
                    {timeAgo && (
                        <span className={cn("text-[10px] shrink-0 tabular-nums", isActive ? "text-white/70" : "text-nx-on-surface-variant/60")}>
                            {timeAgo}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className={cn(
                        "text-xs truncate",
                        isActive ? "text-white/80"
                            : group.unreadCount > 0 ? "text-nx-on-surface font-medium"
                                : "text-nx-on-surface-variant"
                    )}>
                        {group.lastMessage
                            ? group.lastMessage.content
                            : `${group.memberCount} member${group.memberCount !== 1 ? "s" : ""}`}
                    </p>
                    {group.unreadCount > 0 && !isActive && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-nx-primary text-white text-[10px] font-bold">
                            {group.unreadCount > 99 ? "99+" : group.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

// ─── Group Conversation List ──────────────────────────────────────────────────

export function GroupConversationList({
    groups,
    currentUserId,
    onCreateGroup,
}: GroupConversationListProps) {
    const pathname = usePathname();
    const [query, setQuery] = useState("");

    const filtered = groups.filter((g) =>
        g.name.toLowerCase().includes(query.toLowerCase())
    );

    const activeGroupId = pathname.split("/messaging/groups/")[1]?.split("/")[0];

    return (
        <div className="flex flex-col h-full">
            {/* Section Header */}
            <div className="px-4 pt-4 pb-2 shrink-0 flex items-center justify-between">
                <h3 className="text-xs font-bold text-nx-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Enterprise Groups
                </h3>
                {onCreateGroup && (
                    <button
                        onClick={onCreateGroup}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-nx-primary-container transition-colors"
                        title="Create new group"
                        aria-label="Create new group"
                    >
                        <Plus className="w-4 h-4 text-nx-primary" />
                    </button>
                )}
            </div>

            {/* Search — only show when there are enough groups */}
            {groups.length > 3 && (
                <div className="px-3 pb-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nx-on-surface-variant/50" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search groups…"
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white border border-nx-outline-variant focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10 placeholder:text-nx-on-surface-variant/50"
                        />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                        <Users className="w-8 h-8 text-nx-on-surface-variant/30 mb-2" />
                        <p className="text-xs text-nx-on-surface-variant">
                            {query ? "No groups found" : "No group chats yet"}
                        </p>
                        {!query && onCreateGroup && (
                            <button
                                onClick={onCreateGroup}
                                className="mt-2 text-xs text-nx-primary font-medium hover:underline"
                            >
                                Create your first group →
                            </button>
                        )}
                    </div>
                ) : (
                    filtered.map((group) => (
                        <GroupItem
                            key={group.id}
                            group={group}
                            isActive={activeGroupId === group.id}
                            currentUserId={currentUserId}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
