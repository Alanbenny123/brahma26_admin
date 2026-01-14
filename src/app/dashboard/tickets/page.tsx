import { getTickets, getEvents, getTicketsWithEvents } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Ticket } from "lucide-react";
import ClientTicketsPage from "./client-page";

export default async function TicketsPage() {
    const { tickets, total } = await getTicketsWithEvents(true); // Fetch ALL tickets with events
    const { documents: events } = await getEvents(true); // Fetch ALL events

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Tickets
                </h1>
            </div>

            <ClientTicketsPage initialData={tickets as any} events={events as any} total={total} />
        </div>
    );
}
