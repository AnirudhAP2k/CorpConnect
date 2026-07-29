"use client";

import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export const Social = () => {
    const onClick = (provider: string) => {
        signIn(provider, { redirectTo: "/" });
    };

    return (
        <div className="flex items-center gap-3 w-full">
            <Button
                size="lg"
                className="w-full h-11 rounded-xl bg-nx-surface-container-low border border-nx-outline-variant/40 hover:bg-nx-surface-container-high transition-colors font-body text-xs font-semibold text-nx-on-surface flex items-center justify-center gap-2"
                variant="outline"
                onClick={() => { onClick("google"); }}
            >
                <FcGoogle className="h-5 w-5" />
                <span>Google</span>
            </Button>
            <Button
                size="lg"
                className="w-full h-11 rounded-xl bg-nx-surface-container-low border border-nx-outline-variant/40 hover:bg-nx-surface-container-high transition-colors font-body text-xs font-semibold text-nx-on-surface flex items-center justify-center gap-2"
                variant="outline"
                onClick={() => { onClick("github"); }}
            >
                <FaGithub className="h-5 w-5 text-nx-primary" />
                <span>GitHub</span>
            </Button>
        </div>
    );
};