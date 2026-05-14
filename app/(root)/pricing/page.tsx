"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREE_FEATURES, PRO_FEATURES, ENTERPRISE_FEATURES } from "@/constants";
import { useSession } from "next-auth/react";


export default function PricingPage() {
    const session = useSession();
    const user = session?.data?.user;

    return (
        <div className="bg-nx-surface min-h-screen">
            {/* ── Header ── */}
            <header className="pt-20 pb-16 text-center max-w-3xl mx-auto px-4">
                <span className="inline-block text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs mb-5">
                    Tailored Professional Networking
                </span>
                <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-nx-primary tracking-tight leading-[1.08] mb-6">
                    Invest in Your{" "}
                    <span className="text-nx-on-tertiary-container">
                        Professional Capital.
                    </span>
                </h1>
                <p className="text-nx-on-surface-variant text-lg leading-relaxed max-w-2xl mx-auto">
                    Choose the tier that aligns with your growth trajectory. From
                    foundational networking to enterprise-scale strategic expansion.
                </p>
            </header>

            {/* ── Pricing Bento Grid ── */}
            <section className="max-w-6xl mx-auto px-4 md:px-8 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

                    {/* FREE TIER */}
                    <div className="bg-nx-surface-container-low rounded-3xl p-10 flex flex-col transition-all duration-300 hover:bg-nx-surface-container-high border border-transparent hover:border-nx-surface-variant group">
                        <div className="mb-8">
                            <h2 className="font-headline text-2xl font-bold text-nx-primary mb-1">FREE</h2>
                            <p className="text-nx-on-surface-variant text-sm mb-6">Foundational Networking</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-headline font-extrabold text-nx-primary">$0</span>
                                <span className="text-nx-on-surface-variant text-sm">/month</span>
                            </div>
                        </div>
                        <ul className="space-y-4 mb-10 flex-grow">
                            {FREE_FEATURES.map((f) => (
                                <li key={f} className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-nx-primary text-xl shrink-0 mt-0.5">check_circle</span>
                                    <span className="text-nx-on-surface text-sm">{f}</span>
                                </li>
                            ))}
                        </ul>
                        <Button asChild variant="outline" className="w-full py-6 rounded-xl border-2 border-nx-primary text-nx-primary font-headline font-bold text-sm tracking-wide uppercase hover:bg-nx-primary hover:text-white transition-all duration-200">
                            <Link href="/register">Get Started — Free</Link>
                        </Button>
                    </div>

                    {/* PRO TIER — Featured */}
                    <div className="relative bg-nx-primary-container rounded-3xl p-10 flex flex-col shadow-2xl ring-4 ring-nx-tertiary-container z-10 scale-[1.03] lg:scale-[1.04]">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-nx-on-tertiary-container text-nx-primary px-5 py-1.5 rounded-full text-xs font-headline font-bold tracking-widest uppercase shadow-lg whitespace-nowrap">
                            Best Value
                        </div>
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-5 h-5 text-nx-on-tertiary-container" />
                                <h2 className="font-headline text-2xl font-bold text-white">PRO</h2>
                            </div>
                            <p className="text-nx-on-primary-container text-sm mb-6">Strategic Professional Growth</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-headline font-extrabold text-white">$49</span>
                                <span className="text-nx-on-primary-container text-sm">/month</span>
                            </div>
                        </div>
                        <ul className="space-y-4 mb-10 flex-grow">
                            {PRO_FEATURES.map((f) => (
                                <li key={f} className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-nx-on-tertiary-container text-xl shrink-0 mt-0.5">verified</span>
                                    <span className="text-white text-sm font-medium">{f}</span>
                                </li>
                            ))}
                        </ul>
                        <Button asChild className="w-full py-6 rounded-xl bg-nx-on-tertiary-container text-nx-primary font-headline font-bold text-sm tracking-wide uppercase hover:scale-[1.02] transition-all duration-200 shadow-lg">
                            <Link href={user ? "/billing" : "/register"}>Join Pro Now</Link>
                        </Button>
                    </div>

                    {/* ENTERPRISE TIER */}
                    <div className="bg-nx-surface-container-low rounded-3xl p-10 flex flex-col transition-all duration-300 hover:bg-nx-surface-container-high border border-transparent hover:border-nx-surface-variant group">
                        <div className="mb-8">
                            <h2 className="font-headline text-2xl font-bold text-nx-primary mb-1">ENTERPRISE</h2>
                            <p className="text-nx-on-surface-variant text-sm mb-6">Global Scale Solutions</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-5xl font-headline font-extrabold text-nx-primary">Custom</span>
                            </div>
                            <p className="text-nx-on-surface-variant text-xs mt-2">Tailored to your organisation's scope</p>
                        </div>
                        <ul className="space-y-4 mb-10 flex-grow">
                            {ENTERPRISE_FEATURES.map((f) => (
                                <li key={f} className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-nx-primary text-xl shrink-0 mt-0.5">check_circle</span>
                                    <span className="text-nx-on-surface text-sm">{f}</span>
                                </li>
                            ))}
                        </ul>
                        <Button asChild variant="outline" className="w-full py-6 rounded-xl border-2 border-nx-primary text-nx-primary font-headline font-bold text-sm tracking-wide uppercase hover:bg-nx-primary hover:text-white transition-all duration-200">
                            <Link href={user ? "/billing" : "/register"}>Contact Sales</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* ── Secondary CTA Banner ── */}
            <section className="max-w-6xl mx-auto px-4 md:px-8 pb-24">
                <div className="rounded-3xl overflow-hidden relative min-h-[380px] flex items-center">
                    {/* Background image */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="/assets/images/cta_office.png"
                            alt="Corporate Office"
                            fill
                            className="object-cover grayscale opacity-20"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-nx-primary via-nx-primary/90 to-transparent" />
                    </div>
                    {/* Content */}
                    <div className="relative z-10 px-10 md:px-16 max-w-2xl py-16">
                        <h3 className="font-headline text-3xl md:text-4xl font-bold text-white mb-5 leading-snug">
                            Empowering the world's most innovative organisations.
                        </h3>
                        <p className="text-nx-on-primary-container text-lg mb-8 leading-relaxed">
                            CorpConnect's AI-powered networking graph helps businesses discover
                            strategic partners, co-host events, and build lasting industry
                            alliances — at any scale.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild className="px-8 py-6 bg-white text-nx-primary font-headline font-bold rounded-xl hover:bg-nx-surface-container-high transition-colors shadow-lg">
                                <Link href="/events">Explore Events</Link>
                            </Button>
                            <Button asChild variant="outline" className="px-8 py-6 text-white border border-white/30 rounded-xl hover:bg-white/10 transition-colors bg-transparent">
                                <Link href="/organizations/discover">Discover Organisations</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FAQ / Trust Signals ── */}
            <section className="max-w-4xl mx-auto px-4 md:px-8 pb-28 text-center">
                <p className="text-nx-on-surface-variant text-sm">
                    All plans include a <strong className="text-nx-primary">14-day free trial</strong>. No credit card required.
                    Cancel anytime. Questions?{" "}
                    <Link href="mailto:hello@corpconnect.io" className="text-nx-on-tertiary-container underline underline-offset-2 hover:opacity-80">
                        hello@corpconnect.io
                    </Link>
                </p>
            </section>
        </div>
    );
}
