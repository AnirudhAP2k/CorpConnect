import { auth } from '@/auth';
import OrganizationForm from '@/components/shared/OrganizationForm';
import { getAllIndustries } from '@/data/organization';
import React from 'react';

const CreateOrganizationPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const industries = await getAllIndustries();

  return (
    <>
      <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
        <h3 className="wrapper h3-bold text-center sm:text-left">Create Organization</h3>
      </section>

      <div className="wrapper my-8">
        <OrganizationForm userId={session.user.id} type="Create" industries={industries} />
      </div>
    </>
  );
};

export default CreateOrganizationPage;

