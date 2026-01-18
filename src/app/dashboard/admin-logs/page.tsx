import { getAdminLogs, getAdminLogStats } from "@/actions/admin-logs";
import ClientAdminLogsPage from "./client-page";
import SetupGuidePage from "./setup-guide";

export default async function AdminLogsPage() {
    // Fetch initial logs data
    const logsResult = await getAdminLogs({ limit: 100 });
    const statsResult = await getAdminLogStats();

    // If collection doesn't exist, show setup guide
    if (!logsResult.success && logsResult.error?.includes('collection_not_found')) {
        return <SetupGuidePage />;
    }

    return (
        <ClientAdminLogsPage 
            initialLogs={logsResult.logs} 
            initialTotal={logsResult.total}
            stats={statsResult.stats}
        />
    );
}
