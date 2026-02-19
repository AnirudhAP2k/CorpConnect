"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import axios from "axios";

interface Organization {
    id: string;
    name: string;
    logo: string | null;
}

interface OrganizationSwitcherProps {
    organizations: Organization[];
    activeOrganizationId: string | null;
}

const OrganizationSwitcher = ({
    organizations,
    activeOrganizationId,
}: OrganizationSwitcherProps) => {
    const router = useRouter();
    const [switching, setSwitching] = useState(false);
    const [currentOrgId, setCurrentOrgId] = useState(activeOrganizationId);

    const activeOrg = organizations.find((org) => org.id === currentOrgId);

    const handleSwitch = async (organizationId: string) => {
        if (organizationId === currentOrgId) return;

        setSwitching(true);
        try {
            await axios.post("/api/user/active-organization", { organizationId });
            setCurrentOrgId(organizationId);
            router.refresh();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to switch organization");
        } finally {
            setSwitching(false);
        }
    };

    if (organizations.length === 0) {
        return (
            <Button
                variant="outline"
                className="gap-2"
                onClick={() => router.push("/onboarding")}
            >
                <Plus className="w-4 h-4" />
                Create Organization
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 min-w-[200px] justify-between"
                    disabled={switching}
                >
                    <div className="flex items-center gap-2">
                        {activeOrg?.logo ? (
                            <img
                                src={activeOrg.logo}
                                alt={activeOrg.name}
                                className="w-5 h-5 rounded object-cover"
                            />
                        ) : (
                            <Building2 className="w-5 h-5" />
                        )}
                        <span className="truncate">
                            {activeOrg?.name || "Select Organization"}
                        </span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[250px]">
                <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                    <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSwitch(org.id)}
                        className="cursor-pointer"
                    >
                        <div className="flex items-center gap-2 flex-1">
                            {org.logo ? (
                                <img
                                    src={org.logo}
                                    alt={org.name}
                                    className="w-6 h-6 rounded object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-primary-600" />
                                </div>
                            )}
                            <span className="flex-1 truncate">{org.name}</span>
                            {org.id === currentOrgId && (
                                <Check className="w-4 h-4 text-primary-600" />
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => router.push("/onboarding")}
                    className="cursor-pointer text-primary-600"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default OrganizationSwitcher;
