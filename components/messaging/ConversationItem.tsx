"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationItemProps {
    id: string;
    otherOrg: {
        id: string;
        name: string;
        logo: string | null;
        isVerified: boolean;
    };
    lastMessage: {
        content: string;
        createdAt: string;
        senderOrgId: string;
    } | null;
    unreadCount: number;
    isActive: boolean;
    activeOrgId: string;
}

export function ConversationItem({
    id,
    otherOrg,
    lastMessage,
    unreadCount,
    isActive,
    activeOrgId,
}: ConversationItemProps) {
    const isMine = lastMessage?.senderOrgId === activeOrgId;
    const timeAgo = lastMessage
        ? formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })
        : null;

    return (
        <Link
            href={`/messaging/${id}`}
            className={cn(
                "flex items-start gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                isActive
                    ? "bg-nx-primary text-white shadow-nx-primary"
                    : "hover:bg-nx-primary-container/60"
            )}
        >
            {/* Org Logo */}
            <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-nx-surface-container border border-nx-outline-variant">
                    {otherOrg.logo ? (
                        <Image
                            src={otherOrg.logo}
                            alt={otherOrg.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                            {otherOrg.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                {/* Online indicator placeholder */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <span
                        className={cn(
                            "text-sm font-semibold truncate",
                            isActive ? "text-white" : "text-nx-on-surface"
                        )}
                    >
                        {otherOrg.name}
                        {otherOrg.isVerified && (
                            <span className="ml-1 text-[10px] align-middle">✓</span>
                        )}
                    </span>
                    {timeAgo && (
                        <span
                            className={cn(
                                "text-[10px] shrink-0 tabular-nums",
                                isActive ? "text-white/70" : "text-nx-on-surface-variant/60"
                            )}
                        >
                            {timeAgo}
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p
                        className={cn(
                            "text-xs truncate",
                            isActive
                                ? "text-white/80"
                                : unreadCount > 0
                                    ? "text-nx-on-surface font-medium"
                                    : "text-nx-on-surface-variant"
                        )}
                    >
                        {lastMessage
                            ? `${isMine ? "You: " : ""}${lastMessage.content}`
                            : "No messages yet"}
                    </p>
                    {unreadCount > 0 && !isActive && (
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-nx-primary text-white text-[10px] font-bold">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
