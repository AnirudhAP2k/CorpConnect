"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { headerLinks } from "@/constants";

export function TopNavLinks() {
    const pathname = usePathname();

    return (
        <nav className="hidden lg:flex items-center gap-1">
            {headerLinks.map(({ label, route }) => {
                // Active if exact match or same leading segment (e.g. /events/create → /events)
                const isActive =
                    pathname === route ||
                    (route !== "/" && pathname.startsWith(route));

                return (
                    <Link
                        key={route}
                        href={route}
                        className={cn(
                            "relative px-3 py-1.5 font-label font-semibold tracking-[0.06em] text-xs uppercase transition-colors duration-200 rounded-md",
                            isActive
                                ? "text-nx-primary"
                                : "text-nx-on-surface-variant hover:text-nx-on-surface"
                        )}
                    >
                        {label}

                        {/* Animated underline indicator — mirrors the sidebar's active dot feel */}
                        <span
                            className={cn(
                                "absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-nx-on-tertiary-container transition-all duration-300",
                                isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                            )}
                            style={{ transformOrigin: "left" }}
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
