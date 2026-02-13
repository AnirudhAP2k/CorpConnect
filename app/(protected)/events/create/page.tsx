import { auth } from '@/auth';
import EventsForm from '@/components/shared/EventsForm'
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import React from 'react'

const page = async () => {
  const session = await auth();

  const userId = session?.user.id as string;

  if (!userId) {
    redirect('/login');
  }

  // Fetch user's organization
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
    },
  });

  if (!user?.organizationId || !user.organization) {
    return (
      <>
        <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
          <h3 className="wrapper h3-bold text-center sm:text-left">Create Event</h3>
        </section>

        <div className="wrapper my-8">
          <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
            <h4 className="text-lg font-semibold text-red-800 mb-2">
              Organization Required
            </h4>
            <p className="text-red-600 mb-4">
              You must belong to an organization to create events.
            </p>
            <a
              href="/onboarding"
              className="inline-block bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
            >
              Create Organization
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <h3 className="wrapper h3-bold text-center sm:text-left">Create Event</h3>
      </section>

      <div className="wrapper my-8">
        <EventsForm
          userId={userId}
          type="Create"
          organizationId={user.organizationId}
          organizationName={user.organization.name}
        />
      </div>
    </>
  )
}

export default page
