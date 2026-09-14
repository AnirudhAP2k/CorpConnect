"use client";

import { useState } from "react";
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
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Organization {
	id: string;
	name: string;
	logo: string | null;
}

interface OrganizationSwitcherProps {
	organizations: Organization[];
	activeOrganizationId: string | null;
	variant?: "default" | "compact" | "icon";
}

const OrganizationSwitcher = ({
	organizations,
	activeOrganizationId,
	variant = "default",
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
			toast.error(
				error.response?.data?.error || "Failed to switch organization",
			);
		} finally {
			setSwitching(false);
		}
	};

	if (organizations.length === 0) {
		return (
			<Button
				variant="outline"
				className="gap-2 border-nx-outline-variant bg-nx-surface-container-lowest text-nx-on-surface hover:bg-nx-surface-container-high hover:text-nx-on-surface"
				onClick={() => router.push("/onboarding")}
				aria-label={variant === "icon" ? "Create organization" : undefined}
			>
				<Plus className="w-4 h-4" />
				{variant !== "icon" && "Create Organization"}
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="gap-2 min-w-[200px] justify-between border-nx-outline-variant bg-nx-surface-container-lowest text-nx-on-surface hover:bg-nx-surface-container-high hover:text-nx-on-surface"
					disabled={switching}
					aria-label={`Switch organization, current: ${activeOrg?.name ?? "none"}`}
				>
					<div className="flex min-w-0 items-center gap-2">
						{activeOrg?.logo ? (
							<Image
								src={activeOrg.logo}
								alt={activeOrg.name}
								className="w-5 h-5 rounded object-cover"
								width={50}
								height={50}
							/>
						) : (
							<Building2 className="w-5 h-5" />
						)}
						{variant !== "icon" && (
							<span className="truncate">
								{activeOrg?.name || "Select Organization"}
							</span>
						)}
					</div>
					{variant !== "icon" && (
						<ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-[250px] border-nx-outline-variant bg-nx-surface-container-lowest text-nx-on-surface"
			>
				<DropdownMenuLabel className="text-nx-on-surface">
					Your Organizations
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="bg-nx-outline-variant/60" />
				{organizations.map((org) => (
					<DropdownMenuItem
						key={org.id}
						onClick={() => handleSwitch(org.id)}
						className="cursor-pointer focus:bg-nx-surface-container-high focus:text-nx-on-surface"
					>
						<div className="flex items-center gap-2 flex-1">
							{org.logo ? (
								<Image
									width={50}
									height={50}
									src={org.logo}
									alt={org.name}
									className="w-6 h-6 rounded object-cover"
								/>
							) : (
								<div className="w-6 h-6 rounded bg-nx-primary-container flex items-center justify-center">
									<Building2 className="w-4 h-4 text-nx-on-primary-container" />
								</div>
							)}
							<span className="flex-1 truncate">{org.name}</span>
							{org.id === currentOrgId && (
								<Check className="w-4 h-4 text-nx-primary" />
							)}
						</div>
					</DropdownMenuItem>
				))}
				<DropdownMenuSeparator className="bg-nx-outline-variant/60" />
				<DropdownMenuItem
					onClick={() => router.push("/onboarding")}
					className="cursor-pointer text-nx-primary focus:bg-nx-surface-container-high focus:text-nx-primary"
				>
					<Plus className="w-4 h-4 mr-2" />
					Create Organization
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default OrganizationSwitcher;
