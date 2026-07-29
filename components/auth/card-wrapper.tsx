"use client";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Header } from "@/components/auth/Header";
import { Social } from "@/components/auth/Social";
import { BackButton } from "@/components/auth/back-button";

interface CardWrapperProps {
    children: React.ReactNode;
    headerTitle?: string;
    headerLabel: string;
    backButonLabel: string;
    backButonHref: string;
    showSocial?: boolean;
}

export const CardWrapper = ({
    children,
    headerTitle,
    headerLabel,
    backButonLabel,
    backButonHref,
    showSocial
}: CardWrapperProps) => {
    return (
        <Card className="w-full max-w-[440px] bg-nx-surface-container-lowest/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-2 sm:p-4 text-nx-on-surface">
            <CardHeader className="space-y-1 pt-4 pb-2">
                <Header title={headerTitle} label={headerLabel} />
            </CardHeader>
            <CardContent className="pt-2 pb-4">
                {children}
            </CardContent>
            {showSocial && (
                <CardFooter className="flex flex-col gap-4 pb-4">
                    <div className="relative w-full flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-nx-outline-variant/30" />
                        </div>
                        <span className="relative bg-nx-surface-container-lowest px-3 text-[11px] font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                            Or continue with
                        </span>
                    </div>
                    <Social />
                </CardFooter>
            )}
            <CardFooter className="pt-0 pb-4 justify-center">
                <BackButton label={backButonLabel} href={backButonHref} />
            </CardFooter>
        </Card>
    );
};