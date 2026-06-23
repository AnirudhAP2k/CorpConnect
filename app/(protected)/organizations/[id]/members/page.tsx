import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import MembersManagementClient from "@/components/shared/MembersManagementClient";
import { getOrganizationById } from "@/domain/organizations";

interface MembersManagementPageProps {
    params: Promise<{
        id: string;
    }>;
}

const MembersManagementPage = async ({ params }: MembersManagementPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    if (!userId) {
        redirect("/login");
    }

    const organization = await getOrganizationById(id);

    if (!organization) {
        notFound();
    }

    // Check if current user is OWNER or ADMIN
    const currentUserMembership = organization.members.find(
        (m) => m.userId === userId
    );

    if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
        redirect(`/organizations/${id}`);
    }

    return (
        <MembersManagementClient
            organizationId={id}
            initialMembers={organization.members}
            currentUserRole={currentUserMembership.role}
        />
    );
};

export default MembersManagementPage;
