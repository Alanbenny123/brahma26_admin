import { getFirestoreEvents } from "@/actions/firebase";
import ClientImportCSVPage from './client-page';

const FEST_OPTIONS = ['BRAHMA', 'ASHWAMEDHA'];

export default async function ImportCSVPage() {
    let eventNames: string[] = [];
    try {
        const { events } = await getFirestoreEvents();
        eventNames = [...new Set((events || []).map((e: any) => e?.event_name).filter(Boolean))].sort();
    } catch {
        eventNames = [];
    }
    return <ClientImportCSVPage eventNames={eventNames} festOptions={FEST_OPTIONS} />;
}
