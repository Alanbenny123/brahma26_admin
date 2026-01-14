import { getAttendance } from "@/actions/appwrite";
import ClientAttendancePage from "./client-page";

export default async function AttendancePage() {
    const { documents, total } = await getAttendance(true); // Fetch ALL attendance records

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ClientAttendancePage initialData={documents} total={total} />
        </div>
    );
}
