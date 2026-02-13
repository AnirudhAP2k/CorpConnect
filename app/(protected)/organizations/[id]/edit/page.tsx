import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import OrganizationForm from "@/components/shared/OrganizationForm";
import { getAllIndustries } from "@/data/organization";
import axios from "axios";

interface EditOrganizationPageProps {
    params: {
        id: string;
    };
}

const EditOrganizationPage = async ({ params }: EditOrganizationPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    // Fetch organization data
    let organization;
    try {
        const response = await axios.get(
            `/api/organizations/${params.id}`,
        );

        if (response.status !== 200) {
            notFound();
        }

        organization = response.data;
    } catch (error) {
        notFound();
    }

    // Check if current user can edit
    const currentUserMembership = organization.members.find(
        (m: any) => m.userId === userId
    );

    if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
        redirect(`/organizations/${params.id}`);
    }

    const industries = await getAllIndustries();

    // Prepare initial data for form
    const initialData = {
        name: organization.name,
        industryId: organization.industry.id,
        description: organization.description || "",
        website: organization.website || "",
        location: organization.location || "",
        size: organization.size || undefined,
        logo: null,
    };

    return (
        <>
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
                <h3 className="wrapper h3-bold text-center sm:text-left">
                    Edit Organization
                </h3>
            </section>

            <div className="wrapper my-8">
                <OrganizationForm
                    userId={userId}
                    type="Update"
                    industries={industries}
                    initialData={initialData}
                    organizationId={params.id}
                />
            </div>
        </>
    );
};

export default EditOrganizationPage;
