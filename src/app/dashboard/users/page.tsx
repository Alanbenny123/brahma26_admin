import { getUsers, getTransactions, getTickets, getEvents } from "@/actions/appwrite";
import ClientUsersPage from "./client-page";

export default async function UsersPage() {
    const { documents, total } = await getUsers(true); // Fetch ALL users
    const { documents: transactions } = await getTransactions(true); // Fetch ALL transactions
    const { documents: tickets } = await getTickets(true); // Fetch ALL tickets  
    const { documents: events } = await getEvents(true); // Fetch ALL events

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientUsersPage
                initialData={documents as any}
                total={total}
                transactions={transactions as any}
                tickets={tickets as any}
                events={events as any}
            />
        </div>
    );
}
