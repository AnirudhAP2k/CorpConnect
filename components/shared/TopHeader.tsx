import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { auth, signOut } from '@/auth'
import { Button } from '../ui/button'
import OrganizationSwitcher from '@/components/shared/OrganizationSwitcher'
import { prisma } from '@/lib/db'
import MobileSidebar from '@/components/shared/MobileSidebar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { logout } from '@/actions/logout.actions'
import { TopNavLinks } from '@/components/shared/TopNavLinks'
import { NotificationBell, ReminderItem } from '@/components/shared/NotificationBell'
const TopHeader = async () => {
    const session = await auth();

    let userOrganizations: any[] = [];
    let activeOrganizationId: string | null = null;
    let reminders: ReminderItem[] = [];
    const isAdmin = session?.user?.isAppAdmin || false;

    if (session?.user?.id) {
        const memberships = await prisma.organizationMember.findMany({
            where: { userId: session.user.id },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        meta: { select: { verificationStatus: true } }
                    },
                },
            },
        });

        userOrganizations = memberships.map((m) => m.organization);
        activeOrganizationId = session.user.activeOrganizationId || null;

        const pendingInvites = session.user.email ? await prisma.pendingInvite.findMany({
            where: { email: session.user.email, status: "PENDING", expiresAt: { gt: new Date() } },
            include: { organization: true },
        }) : [];

        const unverified = memberships.filter(m =>
            (m.role === "OWNER" || m.role === "ADMIN") &&
            m.organization.meta &&
            ["AWAITING_DOCS", "REJECTED"].includes(m.organization.meta.verificationStatus || "")
        );

        unverified.forEach(m => {
            const status = m.organization.meta?.verificationStatus;
            reminders.push({
                id: `verify-${m.organization.id}`,
                type: "VERIFICATION",
                title: status === "REJECTED" ? "Verification Rejected" : "Verification Required",
                description: status === "REJECTED"
                    ? `Admin notes were provided for ${m.organization.name}. Please resubmit.`
                    : `Complete your KYB details for ${m.organization.name} to unlock all features.`,
                link: `/organizations/${m.organization.id}/complete-verification`,
                date: new Date(),
                read: false,
            });
        });
        pendingInvites.forEach(inv => {
            reminders.push({
                id: `invite-${inv.id}`,
                type: "INVITE",
                title: "Organization Invitation",
                description: `You have been invited to join ${inv.organization.name} as ${inv.role}.`,
                link: "/dashboard",
                date: inv.createdAt,
                read: false,
            });
        });

        const dbNotifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        dbNotifications.forEach((n: any) => {
            reminders.push({
                id: `db-${n.id}`,
                type: n.type as any,
                title: n.title,
                description: n.description,
                link: n.link || "#",
                date: n.createdAt,
                read: n.read,
            });
        });
    }

    // Sort all reminders by date descending
    reminders.sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <header className='w-full border-b bg-background sticky top-0 z-40 h-16 shrink-0'>
            <div className='flex items-center justify-between px-4 h-full container mx-auto max-w-[1600px]'>
                <div className='flex items-center gap-4'>
                    {session?.user && (
                        <div className="md:hidden">
                            <MobileSidebar
                                userOrganizations={userOrganizations}
                                activeOrganizationId={activeOrganizationId}
                                isAdmin={isAdmin}
                            />
                        </div>
                    )}
                    <Link href='/dashboard' className='flex flex-row items-center gap-2 hover:opacity-90 transition-opacity'>
                        <div className="bg-nx-primary text-white p-1 rounded-lg flex items-center justify-center shadow-nx-primary">
                            <span className="material-symbols-outlined text-2xl leading-none">hub</span>
                        </div>
                        <span className="font-headline font-bold text-xl tracking-tight text-nx-primary hidden md:block">
                            CorpConnect
                        </span>
                    </Link>
                </div>

                {/* Centre nav — active-aware, client component */}
                <TopNavLinks />

                <div className='flex items-center gap-4'>
                    {session && session?.user ? (
                        <>
                            <div className='hidden md:block'>
                                <OrganizationSwitcher
                                    organizations={userOrganizations}
                                    activeOrganizationId={activeOrganizationId}
                                />
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:block">
                                    {session.user.apiTier}
                                </span>
                            </div>

                            <NotificationBell reminders={reminders} />

                            <div className='flex items-center gap-3'>
                                <form action={logout}>
                                    <Button className="rounded-full" size="lg" type="submit">
                                        Logout
                                    </Button>
                                </form>
                                <Link href={`/profile`}>
                                    <Image
                                        src={session?.user?.image || "/assets/images/placeholder.svg"}
                                        alt={session?.user?.name || "User Avatar"}
                                        width={36}
                                        height={36}
                                        className="rounded-full border"
                                    />
                                </Link>
                                <ThemeToggle />
                            </div>
                        </>
                    ) : (
                        <div className='flex items-center gap-3'>
                            <ThemeToggle />
                            <Button asChild className="rounded-full" size="lg">
                                <Link href="/login">Login</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default TopHeader
