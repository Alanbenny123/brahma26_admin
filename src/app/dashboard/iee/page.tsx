import { getFirestoreIEE } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientIEEEPage from "./client-page";

export default async function IEEEPage() {
    const { documents, total } = await getFirestoreIEE();
    const normalized = normalizeFirebaseDocs(documents);

    return <ClientIEEEPage initialData={normalized} total={total} />;
}
