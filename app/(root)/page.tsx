"use client";

import Collection from "@/components/shared/Collection";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    CalendarDays,
    Globe,
    Handshake,
    BrainCircuit,
    ArrowRight,
    LayoutDashboard,
    TrendingUp,
    Mail,
    CalendarCheck
} from "lucide-react";

export default function Home() {
    const [events, setEvents] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    const getAllEvents = useCallback(async () => {
        const params = {
            query: '',
            category: '',
            limit: 6,
            page: 1,
        }

        try {
            const response = await axios.get("/api/events", { params });
            setEvents(response.data.data);
            setTotalPages(response.data.totalPages);
        } catch (error: any) {
            console.error(error.response?.data?.error || error.message);
        }
    }, []);

    useEffect(() => {
        getAllEvents();
    }, [getAllEvents]);

    return (
        <div className="bg-nx-surface min-h-screen">
            {/* ══════════════════════════════════════════
                HERO SECTION
                ══════════════════════════════════════════ */}
            <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden bg-nx-surface pt-8 pb-16">
                <div className="container mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text & CTAs */}
                    <div className="z-10 max-w-2xl">
                        <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.2em] uppercase text-nx-on-tertiary-container bg-nx-tertiary-fixed rounded-[4px] font-label">
                            Network Architecture for Leaders
                        </span>
                        <h1 className="text-5xl lg:text-7xl font-headline font-bold text-nx-primary leading-[1.1] mb-8 tracking-tight">
                            Elite Networking for the <span className="text-nx-on-tertiary-container">Modern Executive.</span>
                        </h1>
                        <p className="text-lg text-nx-secondary mb-10 leading-relaxed font-body max-w-lg">
                            Access an exclusive ecosystem designed for strategic growth, high-level connections, and global market insights. Built for those who architect the future.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild className="bg-nx-primary text-white px-10 py-7 rounded-xl font-headline font-semibold text-base hover:opacity-90 transition-all duration-200 shadow-nx-primary">
                                <Link href="/onboarding">Join the Network</Link>
                            </Button>
                            <Button asChild variant="outline" className="bg-nx-surface-container-high text-nx-on-surface px-10 py-7 rounded-xl font-headline font-semibold text-base border-0 hover:bg-nx-surface-container-highest transition-all duration-200">
                                <Link href="#events">Explore Events</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Right: Hero Image & Decorative Elements */}
                    <div className="relative hidden lg:block">
                        <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative z-20 max-w-md ml-auto mr-12">
                            <Image
                                src="/assets/images/hero.png"
                                alt="Executive Meeting"
                                fill
                                className="object-cover"
                                priority
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        </div>
                        {/* Absolute Decorative Elements */}
                        <div className="absolute -bottom-10 right-4 w-64 h-64 bg-nx-primary-container rounded-3xl -z-10 opacity-20 pointer-events-none" />
                        <div className="absolute top-1/2 right-0 translate-y-1/2 w-80 h-40 bg-nx-surface-container-highest rounded-full blur-3xl -z-10 opacity-50 pointer-events-none" />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                TRUST BAR
                ══════════════════════════════════════════ */}
            <section className="py-16 bg-nx-surface-container-low border-y border-nx-surface-variant/50">
                <div className="container mx-auto px-4 md:px-8">
                    <p className="text-center text-[11px] font-bold tracking-[0.15em] uppercase text-nx-on-surface-variant mb-10 font-label">
                        Trusted by Executives from Leading Global Firms
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale">
                        <span className="text-xl font-bold font-headline text-nx-primary">VERTEX</span>
                        <span className="text-xl font-bold font-headline text-nx-primary">MERIDIAN</span>
                        <span className="text-xl font-bold font-headline text-nx-primary">AURORA GRP</span>
                        <span className="text-xl font-bold font-headline text-nx-primary">SYNAPSE</span>
                        <span className="text-xl font-bold font-headline text-nx-primary">ORION</span>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                CORE VALUE PROPS
                ══════════════════════════════════════════ */}
            <section className="py-24 bg-nx-surface">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="grid md:grid-cols-3 gap-16">
                        <div className="group">
                            <div className="w-14 h-14 bg-nx-surface-container-high rounded-2xl flex items-center justify-center mb-8 group-hover:bg-nx-tertiary-fixed transition-colors duration-300 shadow-sm">
                                <Globe className="w-6 h-6 text-nx-primary" />
                            </div>
                            <h3 className="text-xl font-headline font-semibold text-nx-primary mb-4">Global Reach</h3>
                            <p className="text-nx-secondary leading-relaxed text-[15px] font-body">
                                Connect across borders with vetted decision-makers in 40+ countries. Our platform bridges the gap between regional hubs and international markets.
                            </p>
                        </div>
                        <div className="group">
                            <div className="w-14 h-14 bg-nx-surface-container-high rounded-2xl flex items-center justify-center mb-8 group-hover:bg-nx-tertiary-fixed transition-colors duration-300 shadow-sm">
                                <Handshake className="w-6 h-6 text-nx-primary" />
                            </div>
                            <h3 className="text-xl font-headline font-semibold text-nx-primary mb-4">Strategic Partnerships</h3>
                            <p className="text-nx-secondary leading-relaxed text-[15px] font-body">
                                Forge high-impact alliances through AI-driven matching based on objective synergy, market alignment, and historical partnership success.
                            </p>
                        </div>
                        <div className="group">
                            <div className="w-14 h-14 bg-nx-surface-container-high rounded-2xl flex items-center justify-center mb-8 group-hover:bg-nx-tertiary-fixed transition-colors duration-300 shadow-sm">
                                <BrainCircuit className="w-6 h-6 text-nx-primary" />
                            </div>
                            <h3 className="text-xl font-headline font-semibold text-nx-primary mb-4">Exclusive Insights</h3>
                            <p className="text-nx-secondary leading-relaxed text-[15px] font-body">
                                Gain access to private briefings and proprietary market data curated specifically for the suite-level decision-maker. Stay ahead of the curve.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                EVENTS DIRECTORY (Existing feature)
                ══════════════════════════════════════════ */}
            <section id="events" className="py-24 bg-nx-surface-container-low">
                <div className="container mx-auto px-4 md:px-8 flex flex-col gap-8 md:gap-12">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl font-headline font-bold text-nx-primary mb-6">Upcoming Global Events</h2>
                        <p className="text-nx-secondary text-lg font-body">
                            Exclusive summits, private networking sessions, and industry-leading gatherings.
                        </p>
                    </div>

                    <div className="flex flex-col w-full gap-5 md:flex-row bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex-1 text-nx-on-surface-variant font-medium opacity-50 px-2 py-1">
                            Search functionality active internally...
                        </div>
                    </div>

                    <Collection
                        data={events}
                        emptyTitle="No upcoming events right now"
                        emptyStateSubtext="Check back later for exclusive summits."
                        collectionType="All_events"
                        limit={6}
                        page={1}
                        totalPages={totalPages}
                    />
                </div>
            </section>
            {/* ══════════════════════════════════════════
                PLATFORM PREVIEW: BENTO GRID
                ══════════════════════════════════════════ */}
            <section className="py-24 bg-nx-surface-container-low border-t border-nx-surface-variant/50">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="max-w-xl">
                            <h2 className="text-4xl font-headline font-bold text-nx-primary mb-6">Designed for Focus.</h2>
                            <p className="text-nx-secondary text-lg font-body">A sophisticated environment that prioritizes your time. No noise, just meaningful high-level interactions.</p>
                        </div>
                        <div className="flex items-center gap-2 group cursor-pointer text-nx-primary hover:text-nx-on-surface transition-colors">
                            <span className="text-sm font-semibold">View Dashboard Features</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[600px]">
                        {/* Main Dashboard Teaser */}
                        <div className="md:col-span-8 bg-nx-surface-container-lowest rounded-3xl p-8 overflow-hidden relative shadow-sm border border-nx-surface-variant/30 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-nx-tertiary-container rounded-lg flex items-center justify-center">
                                            <LayoutDashboard className="text-nx-on-tertiary-container w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-headline font-bold text-nx-primary">Executive Dashboard</h4>
                                            <p className="text-[10px] text-nx-on-primary-container uppercase tracking-widest font-label">Real-time Network Velocity</p>
                                        </div>
                                    </div>
                                    <div className="flex -space-x-3">
                                        <Image src="/assets/images/user1.png" alt="user" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                        <Image src="/assets/images/user2.png" alt="user" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                        <Image src="/assets/images/user3.png" alt="user" width={32} height={32} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                                        <div className="w-8 h-8 rounded-full bg-nx-primary-container text-[10px] font-bold text-white flex items-center justify-center border-2 border-white relative z-10">+12</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-nx-surface-container p-6 rounded-2xl">
                                        <p className="text-xs text-nx-on-surface-variant font-medium mb-1">New Connection Requests</p>
                                        <span className="text-3xl font-headline font-bold text-nx-primary">14</span>
                                        <div className="mt-4 h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-nx-on-tertiary-container w-[65%]"></div>
                                        </div>
                                    </div>
                                    <div className="bg-nx-surface-container p-6 rounded-2xl">
                                        <p className="text-xs text-nx-on-surface-variant font-medium mb-1">Upcoming Meetings</p>
                                        <span className="text-3xl font-headline font-bold text-nx-primary">06</span>
                                        <div className="mt-4 flex gap-1">
                                            <div className="h-2 w-2 rounded-full bg-nx-on-tertiary-container"></div>
                                            <div className="h-2 w-2 rounded-full bg-nx-on-tertiary-container"></div>
                                            <div className="h-2 w-2 rounded-full bg-nx-outline-variant"></div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 bg-nx-primary-container p-8 rounded-2xl flex items-center justify-between">
                                        <div>
                                            <h5 className="text-white font-headline font-bold mb-2">Quarterly Outlook</h5>
                                            <p className="text-nx-on-primary-container text-xs text-white/70">Strategic alignment with European markets is up by 22%.</p>
                                        </div>
                                        <button className="bg-nx-on-tertiary-container hover:bg-nx-on-tertiary-container/80 transition-colors text-white p-2 rounded-lg">
                                            <TrendingUp className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Glass Element */}
                            <div className="absolute bottom-[-20px] right-8 w-64 h-48 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl p-6 hidden sm:block">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <Mail className="text-green-700 w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-bold text-nx-primary uppercase">New Message</p>
                                </div>
                                <p className="text-xs font-semibold text-nx-primary mb-1">Sarah Chen (CEO, Vertex)</p>
                                <p className="text-[10px] text-nx-secondary leading-tight italic">"Let's discuss the infrastructure expansion during the next summit..."</p>
                            </div>
                        </div>

                        {/* Side Grid Items */}
                        <div className="md:col-span-4 flex flex-col gap-6">
                            <div className="flex-1 bg-nx-surface-container-high rounded-3xl p-8 relative overflow-hidden flex flex-col justify-end min-h-[250px]">
                                <Image src="/assets/images/office_bg.png" alt="background" fill className="object-cover opacity-20" />
                                <h4 className="font-headline font-bold text-nx-primary text-xl mb-2 relative z-10">Member Hub</h4>
                                <p className="text-nx-secondary text-sm relative z-10">Browse over 10k+ verified executive profiles.</p>
                            </div>
                            <div className="flex-1 bg-nx-on-tertiary-container rounded-3xl p-8 flex flex-col justify-center text-white shadow-xl min-h-[200px]">
                                <CalendarCheck className="w-10 h-10 mb-4 opacity-90" />
                                <h4 className="font-headline font-bold text-xl mb-2">Summit Access</h4>
                                <p className="text-white/80 text-sm">Priority RSVP to invite-only networking events globally.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════
                SECONDARY CTA
                ══════════════════════════════════════════ */}
            <section className="py-24 bg-nx-surface">
                <div className="container mx-auto px-4 md:px-8">
                    <div className="bg-nx-primary rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-nx-primary to-nx-primary-container opacity-50"></div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-nx-on-tertiary-container opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-headline font-bold text-white mb-8 leading-tight">
                                Elevate your professional architecture.
                            </h2>
                            <p className="text-nx-on-primary-container text-lg mb-12">CorpConnect is more than a platform; it's a competitive advantage. Apply for membership today to begin your integration.</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-6">
                                <Button asChild className="bg-white text-nx-primary px-12 py-7 rounded-xl font-headline font-bold text-base shadow-xl hover:scale-[1.02] transition-transform duration-200">
                                    <Link href="/sign-up">Apply for Access</Link>
                                </Button>
                                <Button asChild variant="outline" className="border border-nx-on-primary-container text-white px-12 py-7 rounded-xl font-headline font-bold text-base hover:bg-white/5 transition-all outline-none bg-transparent">
                                    <Link href="#pricing">View Membership Tiers</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
