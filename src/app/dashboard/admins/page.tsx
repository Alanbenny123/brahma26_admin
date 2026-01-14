import { getAdmins } from "@/actions/auth";
import ClientAdminsPage from "./client-page";

export default async function AdminsPage() {
    const { documents: admins, total } = await getAdmins(true); // Fetch ALL admins

    return <ClientAdminsPage initialData={admins} total={total} />;
}
