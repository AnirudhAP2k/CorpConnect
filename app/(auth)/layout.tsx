import React from "react";
import Link from "next/link";

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="min-h-screen w-full bg-nx-surface text-nx-on-surface flex flex-col justify-between p-4 sm:p-6 md:p-8">
            {/* Top Bar Logo */}
            <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <div className="bg-nx-primary text-white p-1.5 rounded-xl flex items-center justify-center shadow-nx-primary">
                        <span className="material-symbols-outlined text-2xl leading-none">hub</span>
                    </div>
                    <span className="font-headline font-bold text-xl tracking-tight text-nx-primary">
                        CorpConnect
                    </span>
                </Link>
            </header>

            {/* Main Auth Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center py-8 w-full">
                {children}
            </div>

            {/* Footer */}
            <footer className="w-full max-w-7xl mx-auto text-center py-4 text-xs text-nx-on-surface-variant font-label">
                © {new Date().getFullYear()} CorpConnect. All rights reserved. Professional Relationship Intelligence.
            </footer>
        </main>
    );
}