import { getFirestoreUsersWithEvents, getFirestoreEvents } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientUserEventsPage from "./client-page";

export default async function UserEventsPage() {
    const [usersWithEventsResult, eventsResult] = await Promise.all([
        getFirestoreUsersWithEvents(),
        getFirestoreEvents(),
    ]);

    const users = normalizeFirebaseDocs(usersWithEventsResult.users);
    const events = normalizeFirebaseDocs(eventsResult.events);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                    User Event Registrations
                </h1>
            </div>

            <ClientUserEventsPage initialData={users || []} total={usersWithEventsResult.total || 0} allEvents={events || []} />
        </div>
    );
}
