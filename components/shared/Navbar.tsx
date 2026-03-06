import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { auth, signOut, signIn } from '@/auth'
import { Button } from '../ui/button'
import NavItems from '@/components/shared/NavItems'
import MobileNav from '@/components/shared/MobileNav'
import OrganizationSwitcher from '@/components/shared/OrganizationSwitcher'
import { prisma } from '@/lib/db'

const Navbar = async () => {
  const session = await auth();

  // Fetch user's organizations if logged in
  let userOrganizations: any[] = [];
  let activeOrganizationId: string | null = null;

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

    // Get active organization ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { activeOrganizationId: true },
    });

    activeOrganizationId = user?.activeOrganizationId || null;
  }

  return (
    <header className='w-full border-b'>
      <div className='wrapper flex items-center justify-between'>
        <Link href='/' className='w-36'>
          <Image src='/assets/images/logo.svg' width={128} height={128} alt='logo' />
        </Link>
        {session && session?.user && (
          <>
            <div className='hidden md:flex items-center gap-4'>
              <OrganizationSwitcher
                organizations={userOrganizations}
                activeOrganizationId={activeOrganizationId}
              />
              <nav className='flex-between gap-5'>
                <NavItems />
              </nav>
            </div>
          </>
        )}
        <div className='flex justify-end'>
          <div className='flex items-center gap-5'>
            {session && session?.user ? (
              <>
                <form
                  // className="hidden md:block"
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" })
                  }}>
                  <Button className="rounded-full" size="lg" type="submit">
                    Logout
                  </Button>
                </form>
                <Link href={`/user/${session?.user?.id}`}>
                  <Image
                    src={session?.user?.image || "/assets/images/placeholder.svg"} // default fallback
                    alt={session?.user?.name || "User Avatar"}
                    width={40}
                    height={40}
                    className="rounded-full"
                    sizes="lg"
                  />
                </Link>
                <MobileNav />
              </>
            ) : (
              <form action={async () => {
                "use server";
                await signIn()
              }
              }>
                <Button asChild className="rounded-full" size="lg">
                  <Link href="/login">Login</Link>
                </Button>
              </form>
            )
            }
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
