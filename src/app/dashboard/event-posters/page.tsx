import { getFirestoreEvents } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientEventPostersPage from "./client-page";

export default async function EventPostersPage() {
    const { events, total } = await getFirestoreEvents();
    const normalized = normalizeFirebaseDocs(events);

    return <ClientEventPostersPage events={normalized} total={total} />;
}
