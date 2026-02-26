import { getFirestoreTicketsWithEvents, getFirestoreEvents, getFirestoreUsers } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Ticket } from "lucide-react";
import ClientTicketsPage from "./client-page";

export default async function TicketsPage() {
    const [ticketsResult, eventsResult, usersResult] = await Promise.all([
        getFirestoreTicketsWithEvents(),
        getFirestoreEvents(),
        getFirestoreUsers(),
    ]);

    const tickets = normalizeFirebaseDocs(ticketsResult.tickets);
    const events = normalizeFirebaseDocs(eventsResult.events);
    const users = normalizeFirebaseDocs(usersResult.users);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Tickets
                </h1>
            </div>

            <ClientTicketsPage initialData={tickets as any} events={events as any} users={users as any} total={ticketsResult.total} />
        </div>
    );
}
