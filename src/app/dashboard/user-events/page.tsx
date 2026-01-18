import { getUsersWithEvents } from "@/actions/appwrite";
import ClientUserEventsPage from "./client-page";

export default async function UserEventsPage() {
    const { users, total } = await getUsersWithEvents(true); // Fetch ALL users with their events

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                    User Event Registrations
                </h1>
            </div>

            <ClientUserEventsPage initialData={users || []} total={total || 0} />
        </div>
    );
}
