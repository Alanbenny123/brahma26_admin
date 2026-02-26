import { getFirestoreUsers, getFirestoreTransactions, getFirestoreTickets, getFirestoreEvents } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientUsersPage from "./client-page";

export default async function UsersPage() {
    const [usersResult, transResult, ticketsResult, eventsResult] = await Promise.all([
        getFirestoreUsers(),
        getFirestoreTransactions(),
        getFirestoreTickets(),
        getFirestoreEvents(),
    ]);

    const documents = normalizeFirebaseDocs(usersResult.users);
    const transactions = normalizeFirebaseDocs(transResult.transactions);
    const tickets = normalizeFirebaseDocs(ticketsResult.tickets);
    const events = normalizeFirebaseDocs(eventsResult.events);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientUsersPage
                initialData={documents as any}
                total={usersResult.total}
                transactions={transactions as any}
                tickets={tickets as any}
                events={events as any}
            />
        </div>
    );
}
