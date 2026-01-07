'use client';

import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Users, Ticket, Calendar, ClipboardCheck, LogOut, Home } from "lucide-react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

const navItems = [
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Tickets", href: "/dashboard/tickets", icon: Ticket },
    { name: "Events", href: "/dashboard/events", icon: Calendar },
    { name: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-black/95 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]" />
            </div>

            {/* Top Navigation */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
                    <div className="flex items-center space-x-2">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                            BRAHMA ADMIN
                        </Link>
                    </div>

                    <nav className="hidden md:flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "space-x-2",
                                            isActive ? "bg-white/10 text-cyan-400" : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                    </Button>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center space-x-2">
                        <Link href="/">
                            <Button variant="ghost" size="icon" title="Home">
                                <Home className="w-4 h-4 text-gray-400" />
                            </Button>
                        </Link>
                        <form action={logout}>
                            <Button variant="ghost" size="icon" type="submit" className="text-red-400 hover:bg-red-900/10 hover:text-red-300">
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Mobile Nav (Simple Bottom Bar for small screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-lg p-2 flex justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href} className={cn("p-2 rounded-lg", isActive && "bg-white/10")}>
                            <Icon className={cn("w-6 h-6", isActive ? "text-cyan-400" : "text-gray-400")} />
                        </Link>
                    )
                })}
            </div>

            <main className="relative z-10">
                {children}
            </main>
        </div>
    );
}
