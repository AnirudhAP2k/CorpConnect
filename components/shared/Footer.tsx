"use client";

import Link from "next/link";
import { Share2, AtSign } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-nx-surface-container-low py-16 border-t border-nx-surface-variant/50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <Link href='/dashboard' className='flex flex-row items-center gap-2 hover:opacity-90 transition-opacity'>
                <div className="bg-nx-primary text-white p-1 rounded-lg flex items-center justify-center shadow-nx-primary">
                  <span className="material-symbols-outlined text-2xl leading-none">hub</span>
                </div>
                <span className="font-headline font-bold text-xl tracking-tight text-nx-primary md:hidden lg:block">
                  CorpConnect
                </span>
              </Link>
            </div>
            <p className="text-sm text-nx-secondary leading-relaxed max-w-xs">
              The definitive B2B networking environment for global business leaders and decision-makers.
            </p>
          </div>

          {/* Network */}
          <div>
            <h5 className="font-headline font-bold text-nx-primary mb-6">Network</h5>
            <ul className="space-y-4 text-sm text-nx-secondary">
              <li><Link href="/events" className="hover:text-nx-primary transition-colors">Events Directory</Link></li>
              <li><Link href="/organizations/discover" className="hover:text-nx-primary transition-colors">Discover Organizations</Link></li>
              <li><Link href="/groups" className="hover:text-nx-primary transition-colors">Industry Groups</Link></li>
              <li><Link href="/dashboard" className="hover:text-nx-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h5 className="font-headline font-bold text-nx-primary mb-6">Account</h5>
            <ul className="space-y-4 text-sm text-nx-secondary">
              <li><Link href="/profile" className="hover:text-nx-primary transition-colors">My Profile</Link></li>
              <li><Link href="/my-events" className="hover:text-nx-primary transition-colors">My Events</Link></li>
              <li><Link href="/events/create" className="hover:text-nx-primary transition-colors">Host an Event</Link></li>
              <li><Link href="/onboarding" className="hover:text-nx-primary transition-colors">Join the Network</Link></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h5 className="font-headline font-bold text-nx-primary mb-6">Connect</h5>
            <ul className="space-y-4 text-sm text-nx-secondary mb-8">
              <li><Link href="/sign-up" className="hover:text-nx-primary transition-colors">Apply for Access</Link></li>
              <li><Link href="/login" className="hover:text-nx-primary transition-colors">Log In</Link></li>
            </ul>
            <div className="flex gap-4">
              <a href="#" aria-label="Share" className="w-10 h-10 rounded-full bg-nx-surface-container-high flex items-center justify-center hover:bg-nx-tertiary-fixed transition-colors text-nx-on-surface">
                <Share2 className="w-4 h-4" />
              </a>
              <a href="#" aria-label="Contact" className="w-10 h-10 rounded-full bg-nx-surface-container-high flex items-center justify-center hover:bg-nx-tertiary-fixed transition-colors text-nx-on-surface">
                <AtSign className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-nx-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-nx-on-surface-variant uppercase tracking-[0.2em] font-label font-bold">
            © {new Date().getFullYear()} CorpConnect. All Rights Reserved.
          </p>
          <div className="flex gap-8 text-[10px] font-bold text-nx-on-surface-variant uppercase tracking-widest font-label">
            <Link href="#" className="hover:text-nx-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-nx-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
