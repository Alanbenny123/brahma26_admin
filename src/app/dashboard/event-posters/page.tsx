import { getEvents } from "@/actions/appwrite";
import ClientEventPostersPage from "./client-page";

export default async function EventPostersPage() {
    const { documents: events, total } = await getEvents();
    
    return <ClientEventPostersPage events={events} total={total} />;
}
