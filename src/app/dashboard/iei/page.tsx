import { getIEI } from "@/actions/appwrite";
import ClientIEIPage from "./client-page";

export default async function IEIPage() {
<<<<<<< HEAD
    const { documents: ieiRecords, total } = await getIEI(true); // Fetch ALL IEI records
=======
    const { documents: ieiRecords, total } = await getIEI();
>>>>>>> cbe93f1 (Admin dashboard updates)

    return <ClientIEIPage initialData={ieiRecords} total={total} />;
}
