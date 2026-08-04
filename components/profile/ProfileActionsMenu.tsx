"use client";

import Link from "next/link";
import { Copy, ExternalLink, MoreHorizontal, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileActionsMenuProps {
    /** Absolute URL of the shareable public profile page. */
    publicProfileUrl: string;
    /** Path of the same page, for in-app navigation. */
    publicProfilePath: string;
}

/** Round icon button used in the contact card to share the same public link. */
export function ShareProfileButton({ publicProfileUrl }: { publicProfileUrl: string }) {
    async function share() {
        const shareData = { title: "My CorpConnect profile", url: publicProfileUrl };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
            }
        }

        try {
            await navigator.clipboard.writeText(publicProfileUrl);
            toast.success("Public profile link copied.");
        } catch {
            toast.error("Unable to share profile.");
        }
    }

    return (
        <button
            type="button"
            onClick={share}
            aria-label="Share profile"
            className="w-9 h-9 rounded-full bg-nx-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-nx-primary"
        >
            <Share2 className="w-4 h-4" />
        </button>
    );
}

export function ProfileActionsMenu({
    publicProfileUrl,
    publicProfilePath,
}: ProfileActionsMenuProps) {
    async function copyProfileLink() {
        try {
            await navigator.clipboard.writeText(publicProfileUrl);
            toast.success("Public profile link copied.");
        } catch {
            toast.error("Unable to copy the link.");
        }
    }

    async function shareProfile() {
        const shareData = {
            title: "My CorpConnect profile",
            text: "Here is my CorpConnect profile.",
            url: publicProfileUrl,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;
                toast.error("Unable to share profile.");
            }
            return;
        }

        await copyProfileLink();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    aria-label="More profile actions"
                    className="p-3 h-auto bg-nx-surface-container-low text-nx-on-surface-variant rounded-xl hover:text-nx-primary transition-colors"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyProfileLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy public link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareProfile}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={publicProfilePath} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View as visitor
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
