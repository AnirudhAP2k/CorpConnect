import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import OrganizationForm from "@/components/shared/OrganizationForm";
import { getOrganizationById, getAllIndustries } from "@/domain/organizations";
import { getAllTags } from "@/domain/tags";

interface EditOrganizationPageProps {
    params: Promise<{
        id: string;
    }>;
}

const EditOrganizationPage = async ({ params }: EditOrganizationPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    const { id } = await params;

    // Fetch org, industries, and tags in parallel — no HTTP round-trip
    const [organization, industries, tags] = await Promise.all([
        getOrganizationById(id),
        getAllIndustries(),
        getAllTags(),
    ]);

    if (!organization) {
        notFound();
    }

    // Check if current user can edit
    const currentUserMembership = organization.members.find(
        (m) => m.userId === userId
    );

    if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
        redirect(`/organizations/${id}`);
    }

    // Prepare initial data for form
    const initialData = {
        name: organization.name,
        industryId: organization.industry.id,
        description: organization.description || "",
        website: organization.website || "",
        location: organization.location || "",
        size: organization.size || undefined,
        logo: null,
        // Phase 8: richer profile fields
        services: organization.services ?? [],
        technologies: organization.technologies ?? [],
        partnershipInterests: organization.partnershipInterests ?? [],
        networkingIntent: organization.networkingIntent ?? "GENERAL_NETWORKING",
        linkedinUrl: organization.linkedinUrl ?? "",
        twitterUrl: organization.twitterUrl ?? "",
        tags: organization.orgTags?.map((ot) => ot.tag.label) ?? [],
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
                    tags={tags}
                    initialData={initialData}
                    organizationId={id}
                />
            </div>
        </>
    );
};

export default EditOrganizationPage;

