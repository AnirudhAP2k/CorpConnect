import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrganizationForm from "@/components/shared/OrganizationForm";
import { getAllIndustries } from "@/data/organization";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const OnboardingPage = async () => {
	const session = await auth();

	if (!session?.user?.id) {
		redirect("/login");
	}

	if (session.user.hasCompletedOnboarding) {
		redirect("/dashboard");
	}

	const industries = await getAllIndustries();

	return (
		<div className="flex min-h-screen items-center justify-center bg-nx-surface p-4 font-body text-nx-on-surface">
			<Card className="w-full max-w-2xl rounded-2xl border-nx-outline-variant/60 bg-nx-surface-container-lowest shadow-nx-card">
				<CardHeader className="space-y-2 text-center">
					<CardTitle className="font-headline text-3xl font-bold text-nx-on-surface">
						Welcome to CorpConnect
					</CardTitle>
					<CardDescription className="text-base text-nx-on-surface-variant">
						Let's get started by creating your organization profile. This will
						help other businesses discover and connect with you.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<OrganizationForm
						userId={session.user.id}
						type="Create"
						industries={industries}
					/>
				</CardContent>
			</Card>
		</div>
	);
};

export default OnboardingPage;
