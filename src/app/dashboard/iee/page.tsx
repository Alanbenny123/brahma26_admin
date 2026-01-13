import { getIEE } from "@/actions/appwrite";
import ClientIEEPage from "./client-page";

export default async function IEEPage() {
    const { documents: ieeRecords, total } = await getIEE();

    return <ClientIEEPage initialData={ieeRecords} total={total} />;
}
