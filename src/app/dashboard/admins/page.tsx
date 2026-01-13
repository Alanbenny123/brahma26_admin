import { getAdmins } from "@/actions/auth";
import ClientAdminsPage from "./client-page";

export default async function AdminsPage() {
    const { documents: admins, total } = await getAdmins();

    return <ClientAdminsPage initialData={admins} total={total} />;
}
