import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import EventsForm from "@/components/shared/EventsForm";
import { getEventByIdWithMemberCheck } from "@/data/events";

interface EditEventPageProps {
    params: {
        id: string;
    };
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
            <div className="wrapper min-h-screen flex items-center justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
                    <h2 className="text-2xl font-bold text-red-800 mb-2">Permission Denied</h2>
                    <p className="text-red-600 mb-4">
                        Only organization owners and admins can edit events.
                    </p>
                    <a
                        href={`/events/${params.id}`}
                        className="inline-block bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
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
        <>
            <section className="bg-primary-50 bg-dotted-pattern bg-cover bg-center py-5 md:py-10">
                <h3 className="wrapper h3-bold text-center sm:text-left">Edit Event</h3>
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
        </>
    );
};

export default EditEventPage;
