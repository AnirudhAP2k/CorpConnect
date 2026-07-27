import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireEnterprise } from "@/lib/enterprise";
import { getPitchById } from "@/domain/pitches";
import { PitchDetailView } from "@/components/organizations/PitchDetailView";
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; pitchId: string }>;
}): Promise<Metadata> {
    const { pitchId } = await params;
    const pitch = await getPitchById(pitchId);
    return {
        title: pitch ? `${pitch.title} — Event Pitch` : "Event Pitch Details",
    };
}

export default async function PitchDetailPage({
    params,
}: {
    params: Promise<{ id: string; pitchId: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const { id: organizationId, pitchId } = await params;
    const userId = session.user.id;

    // Verify membership
    const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId },
    });
    if (!membership) redirect(`/organizations/${organizationId}`);

    // Enterprise gate
    await requireEnterprise(organizationId, { redirectTo: `/organizations/${organizationId}` });

    // Load pitch
    const pitch = await getPitchById(pitchId);
    if (!pitch || pitch.organizationId !== organizationId) notFound();

    const isAuthor = pitch.proposedById === userId;
    const isAdmin = ["OWNER", "ADMIN"].includes(membership.role);

    return (
        <PitchDetailView
            pitch={pitch}
            organizationId={organizationId}
            isAdmin={isAdmin}
            isAuthor={isAuthor}
        />
    );
}
