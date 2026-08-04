import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getProfileEditData } from "@/domain/users";

export const metadata: Metadata = {
    title: "Edit Profile | CorpConnect",
    description: "Update your personal CorpConnect profile.",
};

export default async function EditProfilePage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await getProfileEditData(session.user.id);
    if (!user) redirect("/login");

    return (
        <main className="min-h-screen bg-nx-background px-6 py-10">
            <div className="mx-auto max-w-2xl">
                <Link
                    href="/profile"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-nx-on-surface-variant transition-colors hover:text-nx-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to profile
                </Link>

                <Card className="rounded-3xl border-0 shadow-nx-card">
                    <CardHeader className="space-y-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nx-primary text-white">
                            <UserRound className="h-5 w-5" />
                        </div>
                        <CardTitle className="font-headline text-2xl text-nx-primary">
                            Edit your profile
                        </CardTitle>
                        <CardDescription>
                            Update the personal details shown on your profile.
                            Your email and organization details are managed separately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileEditForm
                            initialName={user.name ?? ""}
                            initialImage={user.image ?? ""}
                            initialHeadline={user.headline ?? ""}
                            initialBio={user.bio ?? ""}
                            initialLocation={user.location ?? ""}
                            initialPhone={user.phone ?? ""}
                            initialLinkedinUrl={user.linkedinUrl ?? ""}
                            initialWebsiteUrl={user.websiteUrl ?? ""}
                            initialTwitterUrl={user.twitterUrl ?? ""}
                            initialTwoFactorEnabled={user.isTwoFactorEnabled}
                            canUseTwoFactor={user.canUseTwoFactor}
                            organizations={user.organizations}
                            activeOrganizationId={user.activeOrganizationId}
                        />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
