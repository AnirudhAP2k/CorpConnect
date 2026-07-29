"use client";

interface HeaderProps {
    title?: string;
    label: string;
};

export const Header = ({
    title = "Architect Your Network",
    label,
}: HeaderProps) => {
    return (
        <div className="w-full flex flex-col gap-y-2 items-center justify-center text-center">
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-nx-primary tracking-tight">
                {title}
            </h1>
            <p className="text-nx-on-surface-variant text-sm font-body max-w-xs">
                {label}
            </p>
        </div>
    );
};