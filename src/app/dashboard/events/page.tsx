import { getFirestoreEvents, getFirestoreTickets } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Calendar } from "lucide-react";
import ClientEventsPage from "./client-page";

export default async function EventsPage() {
    const [eventsResult, ticketsResult] = await Promise.all([
        getFirestoreEvents(),
        getFirestoreTickets(),
    ]);

    const events = normalizeFirebaseDocs(eventsResult.events);
    const tickets = normalizeFirebaseDocs(ticketsResult.tickets);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                    Events
                </h1>
            </div>

            <ClientEventsPage
                initialData={events as any}
                total={eventsResult.total}
                tickets={tickets as any}
            />
        </div>
    );
}
