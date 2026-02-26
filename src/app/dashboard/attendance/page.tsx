import { getFirestoreAttendance } from "@/actions/firebase";
import { normalizeFirebaseDocs } from "@/lib/firebase-normalize";
import ClientAttendancePage from "./client-page";

export default async function AttendancePage() {
    const { attendance, total } = await getFirestoreAttendance();
    const documents = normalizeFirebaseDocs(attendance);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientAttendancePage initialData={documents} total={total} />
        </div>
    );
}
