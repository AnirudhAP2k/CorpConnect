import { auth } from "@/auth";
import EventsForm from "@/components/shared/EventsForm";
import { getUserPrimaryOrganization } from "@/domain/users";
import { redirect } from "next/navigation";
import React from "react";

const page = async () => {
	const session = await auth();

	const userId = session?.user.id as string;

	if (!userId) {
		redirect("/login");
	}

	// Fetch user's organization
	const organization = await getUserPrimaryOrganization(userId);

	if (!organization) {
		return (
			<div className="min-h-screen bg-nx-surface text-nx-on-surface">
				<section className="bg-nx-surface-container-low py-8 md:py-12">
					<h1 className="wrapper font-headline text-3xl font-bold tracking-tight">
						Create Event
					</h1>
				</section>

				<div className="wrapper my-8">
					<div className="mx-auto max-w-2xl rounded-2xl border border-nx-error/25 bg-nx-error-container p-6 text-center">
						<h2 className="mb-2 font-headline text-lg font-semibold text-nx-on-error-container">
							Organization Required
						</h2>
						<p className="mb-4 font-body text-nx-on-error-container">
							You must belong to an organization to create events.
						</p>
						<a
							href="/onboarding"
							className="inline-block rounded-xl bg-nx-primary px-6 py-2 font-label font-semibold text-nx-on-primary transition-colors hover:bg-nx-primary/90"
						>
							Create Organization
						</a>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-nx-surface text-nx-on-surface">
			<section className="bg-nx-surface-container-low py-8 md:py-12">
				<h1 className="wrapper font-headline text-3xl font-bold tracking-tight">
					Create Event
				</h1>
			</section>

			<div className="wrapper my-6 sm:my-8">
				<EventsForm
					userId={userId}
					type="Create"
					organizationId={organization.id}
					organizationName={organization.name}
					defaultCurrency={
						organization.preferredCurrency === "INR" ? "INR" : "USD"
					}
				/>
			</div>
		</div>
	);
};

export default page;
