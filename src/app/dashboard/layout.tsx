import { getCurrentAdmin } from "@/actions/auth";
import DashboardNav from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentAdmin = await getCurrentAdmin();

    return (
        <div className="min-h-screen bg-black/95 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            <DashboardNav adminEmail={currentAdmin?.email} />

            <main className="relative z-10 pb-20 lg:pb-0">
                {children}
            </main>
        </div>
    );
}
