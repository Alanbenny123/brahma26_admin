import { getIEEE } from "@/actions/appwrite";
import ClientIEEEPage from "./client-page";

export default async function IEEEPage() {
    const { documents: ieeeRecords, total } = await getIEEE();

    return <ClientIEEEPage initialData={ieeeRecords} total={total} />;
}
