import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Building2, Users, Calendar, Settings, Cpu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";

const adminNavItems = [
    { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/organizations", label: "Organizations", icon: Building2 },
    { href: "/admin/organizations/verify", label: "Verify Orgs", icon: ShieldCheck },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/admin/jobs", label: "Job Queue", icon: Settings },
];

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    // Check isAppAdmin
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAppAdmin: true, name: true },
    });

    if (!user?.isAppAdmin) {
        redirect("/dashboard");
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                {/* Admin brand */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-red-600 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Admin Console</p>
                            <p className="text-xs text-muted-foreground">Evently Platform</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1">
                    {adminNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    >
                        ← Back to App
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
