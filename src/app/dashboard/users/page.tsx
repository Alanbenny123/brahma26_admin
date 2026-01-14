import { getUsers } from "@/actions/appwrite";
import ClientUsersPage from "./client-page";

export default async function UsersPage() {
    const { documents, total } = await getUsers(true); // Fetch ALL users

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientUsersPage initialData={documents as any} total={total} />
        </div>
    );
}
