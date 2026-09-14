import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import EventsForm from "@/components/shared/EventsForm";
import { getEventByIdWithMemberCheck } from "@/data/events";

interface EditEventPageProps {
    params: Promise<{
        id: string;
    }>;
}

const EditEventPage = async ({ params }: EditEventPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    const data = await params;
    const { id } = data;

    if (!userId) {
        redirect(`/login?callbackUrl=/events/${id}/edit`);
    }

    // Fetch event with organization
    const event = await getEventByIdWithMemberCheck(id, userId);

    if (!event) {
        notFound();
    }

    // Check permissions - only OWNER or ADMIN can edit
    const userMembership = event.organization?.members[0];
    if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-nx-surface px-4 text-nx-on-surface">
                <div className="max-w-md rounded-2xl border border-nx-error/25 bg-nx-error-container p-8 text-center">
                    <h2 className="mb-2 font-headline text-2xl font-bold text-nx-on-error-container">Permission Denied</h2>
                    <p className="mb-4 font-body text-nx-on-error-container">
                        Only organization owners and admins can edit events.
                    </p>
                    <a
                        href={`/events/${id}`}
                        className="inline-block rounded-xl bg-nx-primary px-6 py-2 font-label font-semibold text-nx-on-primary transition-colors hover:bg-nx-primary/90"
                    >
                        Back to Event
                    </a>
                </div>
            </div>
        );
    }

    // Prepare initial data for form
    const initialData = {
        title: event.title,
        description: event.description,
        location: event.location,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        categoryId: event.categoryId,
        price: event.price || "",
        isFree: event.isFree,
        url: event.url || "",
        visibility: event.visibility,
        eventType: event.eventType,
        maxAttendees: event.maxAttendees || undefined,
        image: event.image,
    };

    return (
        <div className="min-h-screen bg-nx-surface text-nx-on-surface">
            <section className="bg-nx-surface-container-low py-8 md:py-12">
                <h1 className="wrapper font-headline text-3xl font-bold tracking-tight">Edit Event</h1>
            </section>

            <div className="wrapper my-8">
                <EventsForm
                    userId={userId}
                    type="Update"
                    eventId={id}
                    organizationId={event.organizationId || undefined}
                    organizationName={event.organization?.name}
                    initialData={initialData}
                />
            </div>
        </div>
    );
};

export default EditEventPage;
