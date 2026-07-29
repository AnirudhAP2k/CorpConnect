import Image from "next/image";
import RegisterForm from "@/components/auth/RegisterForm";
import { BrainCircuit, Building2, UsersRound, Zap } from "lucide-react";

export const metadata = {
    title: "Join the Network — CorpConnect Executive Suite",
    description: "Create an executive account for your organization on CorpConnect.",
};

const REGISTER_HIGHLIGHTS = [
    { icon: BrainCircuit, title: "AI-Powered Matchmaking", desc: "Surface high-synergy partners automatically" },
    { icon: Building2, title: "Verified Org Profiles", desc: "Showcase technology stack & partnership intent" },
    { icon: UsersRound, title: "Industry Group Hubs", desc: "Form sector consortiums & co-host summits" },
];

export default function RegisterPage() {
    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto my-auto">
            {/* Left Half: Register Form Card */}
            <div className="lg:col-span-5 flex justify-center w-full order-2 lg:order-1">
                <RegisterForm />
            </div>

            {/* Right Half: Platform Imagery & Branding */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-[480px] lg:min-h-[580px] flex flex-col justify-end p-8 md:p-12 shadow-2xl border border-white/10 group order-1 lg:order-2">
                {/* Background Image */}
                <Image
                    src="/assets/images/auth-signup-bg.png"
                    alt="Corporate Partnership & Enterprise Growth"
                    fill
                    priority
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                />
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#041627] via-[#041627]/75 to-transparent z-10" />
                <div className="absolute inset-0 bg-nx-primary/20 backdrop-brightness-90 z-0" />

                {/* Right Content Overlay */}
                <div className="relative z-20 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-label font-semibold text-nx-on-tertiary-container tracking-wider uppercase">
                        <Zap className="w-4 h-4 text-nx-on-tertiary-container" />
                        Next-Gen B2B Relationship Infrastructure
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-white leading-tight tracking-tight">
                            Expand Your <span className="text-nx-on-tertiary-container">Enterprise Reach.</span>
                        </h1>
                        <p className="text-nx-on-primary-container text-sm md:text-base leading-relaxed max-w-lg font-body">
                            Join a curated network of decision-makers. Every entity on CorpConnect is an organization built for strategic alliances.
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <div className="space-y-3 pt-2">
                        {REGISTER_HIGHLIGHTS.map((item) => (
                            <div key={item.title} className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                                <div className="w-10 h-10 rounded-xl bg-nx-on-tertiary-container/20 flex items-center justify-center text-nx-on-tertiary-container shrink-0">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-headline font-bold text-white">{item.title}</h4>
                                    <p className="text-xs text-nx-on-primary-container font-body">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
