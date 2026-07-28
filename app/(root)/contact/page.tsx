import { Button } from "@/components/ui/button";
import { Mail, Globe2, ShieldCheck, ArrowRight, Clock } from "lucide-react";

export const metadata = {
  title: "Contact Sales & Support — CorpConnect",
  description: "Connect with the CorpConnect executive team. Book a private demo or inquire about Enterprise solutions.",
};

const HUB_LOCATIONS = [
  { city: "London", region: "Europe & UK", status: "Active Hub" },
  { city: "Singapore", region: "Asia Pacific", status: "Active Hub" },
  { city: "New York", region: "Americas", status: "Active Hub" },
  { city: "Bangalore", region: "South Asia", status: "Active Hub" },
];

export default function ContactPage() {
  return (
    <div className="bg-nx-surface text-nx-on-surface min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 py-16 md:py-24">
        
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <span className="inline-block text-nx-on-tertiary-container font-label font-semibold tracking-[0.12em] uppercase text-xs mb-4">
            Executive Engagement
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-headline font-extrabold text-nx-primary tracking-tight leading-[1.08] mb-6">
            Partner with <span className="text-nx-on-tertiary-container">CorpConnect.</span>
          </h1>
          <p className="text-nx-secondary text-lg leading-relaxed font-body">
            Whether you&apos;re looking to deploy CorpConnect across your organization or require custom Enterprise integration, our team is ready to assist.
          </p>
        </div>

        {/* Bento / Asymmetric Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Direct Info & Hubs */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-nx-surface-container-low p-8 rounded-3xl space-y-6">
              <h2 className="text-xl font-headline font-bold text-nx-primary">
                Direct Communication
              </h2>
              
              <div className="space-y-4 text-sm font-body">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-nx-tertiary-fixed flex items-center justify-center text-nx-on-tertiary-container shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-nx-primary">Executive Sales</p>
                    <a href="mailto:hello@corpconnect.io" className="text-nx-on-tertiary-container hover:underline">
                      hello@corpconnect.io
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-nx-tertiary-fixed flex items-center justify-center text-nx-on-tertiary-container shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-nx-primary">Response Standard</p>
                    <p className="text-nx-secondary text-xs">Within 4 business hours for enterprise inquiries</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-nx-tertiary-fixed flex items-center justify-center text-nx-on-tertiary-container shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-nx-primary">KYB & Compliance</p>
                    <p className="text-nx-secondary text-xs">Full verification and SLA guarantees</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Hubs */}
            <div className="bg-nx-primary-container text-white p-8 rounded-3xl space-y-6">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-nx-on-tertiary-container" />
                <h3 className="text-lg font-headline font-bold">Global Infrastructure Hubs</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {HUB_LOCATIONS.map((hub) => (
                  <div key={hub.city} className="p-3 rounded-xl bg-white/10 border border-white/10">
                    <p className="font-headline font-bold text-sm">{hub.city}</p>
                    <p className="text-[11px] text-nx-on-primary-container">{hub.region}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Inquiry Form Card */}
          <div className="lg:col-span-7 bg-nx-surface-container-lowest p-8 md:p-12 rounded-3xl shadow-nx-card border border-nx-outline-variant/30">
            <h2 className="text-2xl font-headline font-bold text-nx-primary mb-2">
              Request Executive Demo
            </h2>
            <p className="text-sm text-nx-secondary mb-8 font-body">
              Fill in your organization details and a specialist will reach out to schedule a customized walkthrough.
            </p>

            <form className="space-y-6" action="mailto:hello@corpconnect.io" method="GET">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-4 py-3 bg-nx-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-nx-on-tertiary-container text-nx-on-surface"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@company.com"
                    className="w-full px-4 py-3 bg-nx-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-nx-on-tertiary-container text-nx-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    className="w-full px-4 py-3 bg-nx-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-nx-on-tertiary-container text-nx-on-surface"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                    Inquiry Type
                  </label>
                  <select className="w-full px-4 py-3 bg-nx-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-nx-on-tertiary-container text-nx-on-surface">
                    <option value="enterprise">Enterprise Membership</option>
                    <option value="demo">Platform Walkthrough / Demo</option>
                    <option value="partner">Design Partner Program</option>
                    <option value="other">General Support</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                  Message / Requirements
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your organization's networking goals..."
                  className="w-full px-4 py-3 bg-nx-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-nx-on-tertiary-container text-nx-on-surface"
                />
              </div>

              <Button type="submit" className="w-full py-6 bg-nx-primary text-white font-headline font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
                Submit Inquiry <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
