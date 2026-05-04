import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function MessagingPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
            {/* Icon */}
            <div className="w-24 h-24 rounded-3xl bg-nx-primary-container flex items-center justify-center shadow-nx-card">
                <MessageSquare className="w-12 h-12 text-nx-primary" />
            </div>

            {/* Heading */}
            <div className="space-y-2 max-w-xs">
                <h1 className="text-xl font-headline font-bold text-nx-on-surface">
                    Business Messaging
                </h1>
                <p className="text-sm text-nx-on-surface-variant leading-relaxed">
                    Select a conversation from the sidebar, or start a new one by
                    visiting a connected organization&apos;s profile.
                </p>
            </div>

            {/* CTA */}
            <Link
                href="/organizations/discover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-nx-primary text-white hover:opacity-90 active:scale-95 transition-all duration-200 shadow-nx-primary"
            >
                Discover Organizations
                <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Tip */}
            <p className="text-xs text-nx-on-surface-variant/50 max-w-[260px]">
                💡 You can only message organizations you&apos;re connected with.
                Send a connection request first!
            </p>
        </div>
    );
}
