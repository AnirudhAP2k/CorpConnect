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
    PanelLeftClose,
    PanelLeftOpen
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

export default function Sidebar({ activeOrganizationId, isAdmin, className }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={cn(
            "border-r bg-card h-[calc(100vh-4rem)] sticky top-16 hidden md:flex flex-col shrink-0 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64",
            className
        )}>
            <div className="p-4 flex-1 space-y-6 overflow-y-auto overflow-x-hidden relative">

                {/* Main Navigation */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Platform
                        </h3>
                    )}
                    {sidebarLinks.map((link) => {
                        // For Dashboard, exact match. For others, allow active on sub-routes
                        const isActive = link.route === '/dashboard'
                            ? pathname === link.route
                            : pathname === link.route || pathname.startsWith(`${link.route}/`);

                        return (
                            <Link
                                key={link.route}
                                href={link.route}
                                title={isCollapsed ? link.label : undefined}
                                className={cn(
                                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isCollapsed ? "justify-center" : "gap-3",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span className="shrink-0">{iconMap[link.icon as string]}</span>
                                {!isCollapsed && <span className="truncate">{link.label}</span>}
                            </Link>
                        );
                    })}
                </div>

                {/* Organization Management */}
                {activeOrganizationId && (
                    <div className="space-y-1">
                        {!isCollapsed && (
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
                                My Organization
                            </h3>
                        )}
                        <Link
                            href={`/organizations/${activeOrganizationId}`}
                            title={isCollapsed ? "Profile" : undefined}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "gap-3",
                                pathname === `/organizations/${activeOrganizationId}` ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="shrink-0"><Settings className="w-5 h-5" /></span>
                            {!isCollapsed && <span className="truncate">Profile</span>}
                        </Link>
                        <Link
                            href={`/organizations/${activeOrganizationId}/dashboard`}
                            title={isCollapsed ? "Dashboard" : undefined}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "gap-3",
                                pathname === `/organizations/${activeOrganizationId}/dashboard` ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="shrink-0"><BarChart3 className="w-5 h-5" /></span>
                            {!isCollapsed && <span className="truncate">Dashboard</span>}
                        </Link>
                        <Link
                            href={`/organizations/${activeOrganizationId}/dashboard?tab=connections`}
                            title={isCollapsed ? "Connections" : undefined}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "gap-3",
                                "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="shrink-0"><Mail className="w-5 h-5" /></span>
                            {!isCollapsed && <span className="truncate">Connections</span>}
                        </Link>
                    </div>
                )}

                {/* Administration */}
                <div className="space-y-1">
                    {!isCollapsed && (
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
                            Account
                        </h3>
                    )}
                    <Link
                        href="/profile"
                        title={isCollapsed ? "My Profile" : undefined}
                        className={cn(
                            "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isCollapsed ? "justify-center" : "gap-3",
                            pathname === "/profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <span className="shrink-0"><User className="w-5 h-5" /></span>
                        {!isCollapsed && <span className="truncate">My Profile</span>}
                    </Link>
                    {isAdmin && (
                        <Link
                            href="/admin/dashboard"
                            title={isCollapsed ? "Admin Console" : undefined}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isCollapsed ? "justify-center" : "gap-3",
                                pathname.startsWith("/admin") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="shrink-0"><Shield className="w-5 h-5" /></span>
                            {!isCollapsed && <span className="truncate">Admin Console</span>}
                        </Link>
                    )}
                </div>

            </div>

            {/* Toggle Button */}
            <div className="p-4 border-t border-border mt-auto">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    className="flex w-full items-center justify-center p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                >
                    {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
            </div>
        </aside>
    );
}
