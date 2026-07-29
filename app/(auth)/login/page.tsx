import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import { Building2, Globe2, Users, ShieldCheck, BrainCircuit, CalendarCheck } from "lucide-react";

const LOGIN_HIGHLIGHTS = [
    { icon: BrainCircuit, label: "AI-Powered Partner Matching" },
    { icon: Building2, label: "Verified Organization Profiles" },
    { icon: CalendarCheck, label: "Private Executive Summits" },
];

export const metadata = {
    title: "Sign In — CorpConnect Executive Suite",
    description: "Sign in to your organization workspace on CorpConnect.",
};

export default function LoginPage() {
    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto my-auto">
            {/* Left Half: Platform Imagery & Branding */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[480px] lg:min-h-[580px] flex flex-col justify-end p-8 md:p-12 shadow-2xl border border-white/10 group">
                {/* Background Image */}
                <Image
                    src="/assets/images/auth-login-bg.png"
                    alt="Corporate Networking Boardroom"
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                />
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#041627] via-[#041627]/75 to-transparent z-10" />
                <div className="absolute inset-0 bg-nx-primary/20 backdrop-brightness-90 z-0" />

                {/* Left Content Overlay */}
                <div className="relative z-20 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-label font-semibold text-nx-on-tertiary-container tracking-wider uppercase">
                        <ShieldCheck className="w-4 h-4 text-nx-on-tertiary-container" />
                        Executive Relationship Intelligence
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-white leading-tight tracking-tight">
                            Architect Your <span className="text-nx-on-tertiary-container">Network.</span>
                        </h1>
                        <p className="text-nx-on-primary-container text-sm md:text-base leading-relaxed max-w-lg font-body">
                            Access an exclusive ecosystem of verified B2B organizations, AI-matched strategic partners, and private executive summits.
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        {LOGIN_HIGHLIGHTS.map((item) => (
                            <div key={item.label} className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-white/10">
                                <item.icon className="w-4 h-4 text-nx-on-tertiary-container shrink-0" />
                                <span className="text-xs font-label font-semibold text-white">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Half: Login Form Card */}
            <div className="lg:col-span-5 flex justify-center w-full">
                <LoginForm />
            </div>
        </div>
    );
}
