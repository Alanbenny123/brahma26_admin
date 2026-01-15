import { getIEI } from "@/actions/appwrite";
import ClientIEIPage from "./client-page";

export default async function IEIPage() {
    const { documents: ieiRecords, total } = await getIEI();

    return <ClientIEIPage initialData={ieiRecords} total={total} />;
}
