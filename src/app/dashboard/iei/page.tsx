import { getFirestoreIEI } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientIEIPage from "./client-page";

export default async function IEIPage() {
    const { documents, total } = await getFirestoreIEI();
    const normalized = normalizeFirebaseDocs(documents);

    return <ClientIEIPage initialData={normalized} total={total} />;
}
