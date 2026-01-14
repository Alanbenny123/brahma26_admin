import { getIEEE } from "@/actions/appwrite";
import ClientIEEEPage from "./client-page";

<<<<<<< HEAD
export default async function IEEPage() {
    const { documents: ieeRecords, total } = await getIEE(true); // Fetch ALL IEE records
=======
export default async function IEEEPage() {
    const { documents: ieeeRecords, total } = await getIEEE();
>>>>>>> cbe93f1 (Admin dashboard updates)

    return <ClientIEEEPage initialData={ieeeRecords} total={total} />;
}
