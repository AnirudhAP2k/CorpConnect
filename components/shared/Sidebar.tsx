"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sidebarLinks } from "@/constants";
import { useState } from "react";
import {
    Home,
    Building2,
    UsersRound,
    CalendarDays,
    Ticket,
    Settings,
    BarChart3,
    Mail,
    User,
    Shield,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
    Home: <Home className="w-5 h-5" />,
    Building2: <Building2 className="w-5 h-5" />,
    UsersRound: <UsersRound className="w-5 h-5" />,
    CalendarDays: <CalendarDays className="w-5 h-5" />,
    Ticket: <Ticket className="w-5 h-5" />,
};

interface SidebarProps {
    activeOrganizationId: string | null;
    isAdmin: boolean;
    className?: string;
}

/* ─── Nexus Corporate: Section label ─────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
    return (
        <p className="px-4 text-[10px] font-label font-semibold text-nx-on-surface-variant/60 uppercase tracking-[0.08em] mb-1 mt-2">
            {label}
        </p>
    );
}

/* ─── Nexus Corporate: Nav item ──────────────────────────────────── */
function NavItem({
    href,
    icon,
    label,
    isActive,
    isCollapsed,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
}) {
    return (
        <Link
            href={href}
            title={isCollapsed ? label : undefined}
            className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isCollapsed && "justify-center px-3",
                isActive
                    ? "bg-white text-nx-on-tertiary-container shadow-nx-card font-semibold scale-[0.97]"
                    : "text-nx-on-surface-variant hover:bg-white/60 hover:text-nx-on-surface hover:translate-x-0.5"
            )}
        >
            <span className={cn("shrink-0", isActive ? "text-nx-on-tertiary-container" : "")}>
                {icon}
            </span>
            {!isCollapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

export default function Sidebar({ activeOrganizationId, isAdmin, className }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                // Nexus Corporate: warm slate-50 background, no border — depth via color shift
                "bg-[#f8f7f8] h-[calc(100vh-4rem)] sticky top-16 hidden md:flex flex-col shrink-0 transition-all duration-300 overflow-hidden",
                isCollapsed ? "w-[72px]" : "w-64",
                className
            )}
        >
            {/* ── Wordmark (visible when expanded) ── */}
            {!isCollapsed && (
                <div className="px-6 pt-6 pb-4">
                    <h2 className="text-base font-headline font-bold text-nx-primary tracking-tight">
                        CorpConnect
                    </h2>
                    <p className="text-[10px] font-label font-semibold text-nx-on-surface-variant/50 uppercase tracking-[0.08em] mt-0.5">
                        Elite Networking
                    </p>
                </div>
            )}
            {isCollapsed && <div className="pt-6 pb-4" />}

            {/* ── Scrollable nav area ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-0.5">

                {/* Platform */}
                {!isCollapsed && <SectionLabel label="Platform" />}
                {sidebarLinks.map((link) => {
                    const isActive =
                        link.route === "/dashboard"
                            ? pathname === link.route
                            : pathname === link.route || pathname.startsWith(`${link.route}/`);
                    return (
                        <NavItem
                            key={link.route}
                            href={link.route}
                            icon={iconMap[link.icon as string]}
                            label={link.label}
                            isActive={isActive}
                            isCollapsed={isCollapsed}
                        />
                    );
                })}

                {/* My Organization */}
                {activeOrganizationId && (
                    <>
                        {!isCollapsed && <SectionLabel label="My Organization" />}
                        <NavItem
                            href={`/organizations/${activeOrganizationId}`}
                            icon={<Settings className="w-5 h-5" />}
                            label="Profile"
                            isActive={pathname === `/organizations/${activeOrganizationId}`}
                            isCollapsed={isCollapsed}
                        />
                        <NavItem
                            href={`/organizations/${activeOrganizationId}/dashboard`}
                            icon={<BarChart3 className="w-5 h-5" />}
                            label="Dashboard"
                            isActive={pathname === `/organizations/${activeOrganizationId}/dashboard`}
                            isCollapsed={isCollapsed}
                        />
                        <NavItem
                            href={`/organizations/${activeOrganizationId}/dashboard?tab=connections`}
                            icon={<Mail className="w-5 h-5" />}
                            label="Connections"
                            isActive={false}
                            isCollapsed={isCollapsed}
                        />
                    </>
                )}

                {/* Account */}
                {!isCollapsed && <SectionLabel label="Account" />}
                <NavItem
                    href="/profile"
                    icon={<User className="w-5 h-5" />}
                    label="My Profile"
                    isActive={pathname === "/profile"}
                    isCollapsed={isCollapsed}
                />
                {isAdmin && (
                    <NavItem
                        href="/admin/dashboard"
                        icon={<Shield className="w-5 h-5" />}
                        label="Admin Console"
                        isActive={pathname.startsWith("/admin")}
                        isCollapsed={isCollapsed}
                    />
                )}
            </div>

            {/* ── CTA + Collapse toggle ── */}
            <div className="p-3 space-y-2">
                {/* Book Meeting CTA — Nexus Corporate primary gradient */}
                {!isCollapsed && (
                    <div className="bg-nx-primary-container rounded-xl p-4">
                        <Link
                            href="/events"
                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-nx-primary text-white rounded-lg text-sm font-semibold font-headline hover:opacity-90 transition-opacity shadow-nx-primary"
                        >
                            <Calendar className="w-4 h-4" />
                            Browse Events
                        </Link>
                    </div>
                )}

                {/* Collapse toggle — no border, tonal */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    className="flex w-full items-center justify-center p-2.5 rounded-lg hover:bg-white/80 text-nx-on-surface-variant transition-colors duration-200"
                >
                    {isCollapsed
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronLeft className="w-4 h-4" />
                    }
                    {!isCollapsed && (
                        <span className="ml-2 text-xs font-label text-nx-on-surface-variant">
                            Collapse
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}
