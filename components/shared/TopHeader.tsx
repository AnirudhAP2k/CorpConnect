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

const TopHeader = async () => {
    const session = await auth();

    let userOrganizations: any[] = [];
    let activeOrganizationId: string | null = null;
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
                    },
                },
            },
        });

        userOrganizations = memberships.map((m) => m.organization);
        activeOrganizationId = session.user.activeOrganizationId || null;
    }

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
                            <Link
                                href="/pricing"
                                className="hidden sm:inline-flex text-nx-on-surface-variant hover:text-nx-primary font-label font-semibold text-xs uppercase tracking-widest transition-colors"
                            >
                                Membership
                            </Link>
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
