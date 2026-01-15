'use client';

import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Users, Ticket, Calendar, ClipboardCheck, LogOut, Home, RefreshCw, ImageIcon, Database, Receipt, Shield, Award, Menu, X, MoreHorizontal, UserCircle } from "lucide-react";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';
import { cn } from "@/lib/utils";

// Main navigation items
const mainNavItems = [
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Tickets", href: "/dashboard/tickets", icon: Ticket },
    { name: "Events", href: "/dashboard/events", icon: Calendar },
    { name: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
];

// Secondary navigation items (under "More" dropdown)
const moreNavItems = [
    { name: "Certificates", href: "/dashboard/certificates", icon: Award },
    { name: "Event Posters", href: "/dashboard/event-posters", icon: ImageIcon },
    { name: "IEEE Records", href: "/dashboard/iee", icon: Database },
    { name: "IEI Records", href: "/dashboard/iei", icon: Database },
    { name: "Admins", href: "/dashboard/admins", icon: Shield },
    { name: "Sync", href: "/dashboard/sync", icon: RefreshCw },
    { name: "Migrate Events", href: "/dashboard/migrate-events", icon: RefreshCw },
    { name: "Data Fetch", href: "/dashboard/data-example", icon: Database },
];

interface DashboardNavProps {
    adminEmail?: string | null;
}

export default function DashboardNav({ adminEmail }: DashboardNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);

    const handleLogout = async () => {
        startTransition(async () => {
            try {
                router.refresh();
                await logout();
            } catch (error) {
                console.error("Logout error:", error);
                window.location.href = '/login';
            }
        });
    };

    const allNavItems = [...mainNavItems, ...moreNavItems];

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
                <div className="flex items-center space-x-4">
                    <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
                        <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            BRAHMA ADMIN
                        </span>
                        <span className="text-xs text-gray-500 tracking-wider">
                            ASHWAMEDHA
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1">
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant="ghost"
                                    size="sm"
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
                    
                    {/* More Dropdown */}
                    <div 
                        className="relative"
                        onMouseEnter={() => setIsMoreDropdownOpen(true)}
                        onMouseLeave={() => setIsMoreDropdownOpen(false)}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "space-x-2 transition-all duration-200",
                                moreNavItems.some(item => pathname.startsWith(item.href)) ? "bg-white/10 text-cyan-400" : "text-gray-400 hover:text-white",
                                isMoreDropdownOpen && "bg-white/10 text-cyan-400"
                            )}
                        >
                            <MoreHorizontal className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isMoreDropdownOpen && "rotate-90"
                            )} />
                            <span>More</span>
                        </Button>
                        
                        {isMoreDropdownOpen && (
                            <div className="absolute right-0 top-full pt-2 w-48 z-50">
                                <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    {moreNavItems.map((item, index) => {
                                        const Icon = item.icon;
                                        const isActive = pathname.startsWith(item.href);
                                        return (
                                            <Link 
                                                key={item.href} 
                                                href={item.href}
                                                style={{
                                                    animationDelay: `${index * 30}ms`
                                                }}
                                                className="block animate-in fade-in slide-in-from-top-1 duration-150"
                                            >
                                                <div
                                                    className={cn(
                                                        "flex items-center space-x-3 px-4 py-3 hover:bg-white/5 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg hover:translate-x-1",
                                                        isActive ? "text-cyan-400 bg-white/5" : "text-gray-400"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-sm">{item.name}</span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:flex items-center space-x-3">
                    {/* Admin Info */}
                    {adminEmail && (
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                            <UserCircle className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs text-gray-300">{adminEmail}</span>
                        </div>
                    )}
                    
                    <Link href="/">
                        <Button variant="ghost" size="icon" title="Home">
                            <Home className="w-4 h-4 text-gray-400" />
                        </Button>
                    </Link>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleLogout}
                        disabled={isPending}
                        className="text-red-400 hover:bg-red-900/10 hover:text-red-300"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden text-gray-400"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden border-t border-white/10 bg-black/90 backdrop-blur-md">
                    <div className="p-4 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
                        {/* Admin Info Mobile */}
                        {adminEmail && (
                            <div className="flex items-center space-x-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg mb-2">
                                <UserCircle className="w-5 h-5 text-cyan-400" />
                                <span className="text-sm text-gray-300">{adminEmail}</span>
                            </div>
                        )}
                        
                        {allNavItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <div
                                        className={cn(
                                            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                                            isActive ? "bg-white/10 text-cyan-400" : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </div>
                                </Link>
                            );
                        })}
                        
                        <div className="border-t border-white/10 pt-2 mt-2 space-y-2">
                            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                                <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                                    <Home className="w-5 h-5" />
                                    <span>Home</span>
                                </div>
                            </Link>
                            <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    handleLogout();
                                }}
                                disabled={isPending}
                                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/10 transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
