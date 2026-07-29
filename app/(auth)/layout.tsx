import React from "react";
import Link from "next/link";

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="min-h-screen w-full bg-gradient-to-br from-[#041627] via-[#0b2238] to-[#020b14] text-white flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-nx-on-tertiary-container/10 rounded-full blur-[140px] pointer-events-none -translate-y-1/2" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-nx-primary-container/30 rounded-full blur-[160px] pointer-events-none translate-y-1/2" />

            {/* Top Navigation Bar */}
            <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <div className="bg-nx-on-tertiary-container text-nx-primary p-2 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-2xl leading-none font-bold">hub</span>
                    </div>
                    <span className="font-headline font-bold text-2xl tracking-tight text-white">
                        CorpConnect
                    </span>
                </Link>
                <div className="text-xs font-label text-nx-on-primary-container hidden sm:block">
                    Executive Suite Portal
                </div>
            </header>

            {/* Content Container */}
            <div className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10">
                {children}
            </div>

            {/* Footer */}
            <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-nx-on-primary-container/70 font-label z-20">
                © {new Date().getFullYear()} CorpConnect. All rights reserved. Professional Relationship Intelligence.
            </footer>
        </main>
    );
}