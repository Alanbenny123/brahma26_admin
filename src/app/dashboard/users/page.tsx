import { getFirestoreUsers } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientUsersPage from "./client-page";

export default async function UsersPage() {
    const usersResult = await getFirestoreUsers();
    const documents = normalizeFirebaseDocs(usersResult.users);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientUsersPage
                initialData={documents as any}
                total={usersResult.total}
                transactions={[]}
                tickets={[]}
                events={[]}
            />
        </div>
    );
}
