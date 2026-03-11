"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import OrganizationSwitcher from "./OrganizationSwitcher";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface MobileSidebarProps {
    userOrganizations: any[];
    activeOrganizationId: string | null;
    isAdmin: boolean;
}

export default function MobileSidebar({ userOrganizations, activeOrganizationId, isAdmin }: MobileSidebarProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Close the sheet when the route changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 pt-12 flex flex-col">
                <VisuallyHidden>
                    <SheetTitle>Navigation Options</SheetTitle>
                    <SheetDescription>Access platform sections and org switching</SheetDescription>
                </VisuallyHidden>

                <div className="px-4 pb-4">
                    <OrganizationSwitcher
                        organizations={userOrganizations}
                        activeOrganizationId={activeOrganizationId}
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <Sidebar
                        activeOrganizationId={activeOrganizationId}
                        isAdmin={isAdmin}
                        className="flex md:flex h-auto sticky-none w-full border-none"
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
