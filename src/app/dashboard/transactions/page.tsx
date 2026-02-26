import { getFirestoreTransactions } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientTransactionsPage from "./client-page";

export default async function TransactionsPage() {
    const { transactions, total } = await getFirestoreTransactions();
    const documents = normalizeFirebaseDocs(transactions);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Transactions
                </h1>
            </div>

            <ClientTransactionsPage initialData={documents as any} total={total} />
        </div>
    );
}
