'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { deleteItem, updateItem, createItem } from "@/actions/appwrite";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Users as UsersIcon, BarChart3, Plus, Loader2, IndianRupee, RefreshCw, Download } from "lucide-react";
import bcrypt from "bcryptjs";
import { useActivityLogger, logAdminAction } from "@/lib/use-activity-logger";
import { fetchPaymentDetails } from "@/actions/razorpay";

// Define the shape of a User based on Appwrite schema
interface User {
    $id: string;
    name: string;
    email: string;
    pass: string;
    phone?: number;
    college?: string;
    certificates?: string[];
    tickets?: string[];
}

interface Transaction {
    $id: string;
    transition_id: string;
    stud_id?: string;
    ticket_id?: string;
}

interface Ticket {
    $id: string;
    event_id: string;
    stud_id?: string[];
    active: boolean;
}

interface Event {
    $id: string;
    event_name: string;
    amount: string;
}

interface AmountData {
    amount?: number;
    status?: string;
    method?: string;
    loading?: boolean;
    error?: string;
}

interface ClientUsersPageProps {
    initialData: User[];
    total: number;
    transactions: Transaction[];
    tickets: Ticket[];
    events: Event[];
}

export default function ClientUsersPage({ initialData, total, transactions, tickets, events }: ClientUsersPageProps) {
    // Log page view
    useActivityLogger();

    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<User | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [transactionIdInput, setTransactionIdInput] = useState('');
    const [formData, setFormData] = useState<Partial<User>>({});

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState<'name' | 'email' | 'phone' | 'college' | '$id'>('name');

    // Amount fetching state - stores Razorpay data keyed by user $id
    const [amounts, setAmounts] = useState<Map<string, AmountData>>(new Map());
    const [isFetchingAll, setIsFetchingAll] = useState(false);

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    // Create a map of user ID to their transaction
    const userTransactionMap = new Map<string, Transaction>();
    transactions.forEach((t) => {
        if (t.stud_id) {
            userTransactionMap.set(t.stud_id, t);
        }
    });

    // Create a map of user ID to count of tickets they're assigned to
    const userTicketCountMap = new Map<string, number>();
    tickets.forEach((ticket) => {
        if (ticket.stud_id && Array.isArray(ticket.stud_id)) {
            ticket.stud_id.forEach((studentId) => {
                userTicketCountMap.set(studentId, (userTicketCountMap.get(studentId) || 0) + 1);
            });
        }
    });

    // Create lookup maps for fallback pricing
    const ticketMap = new Map<string, Ticket>();
    tickets.forEach((t) => ticketMap.set(t.$id, t));

    const eventMap = new Map<string, Event>();
    events.forEach((e) => eventMap.set(e.$id, e));

    // Helper: Get event price from transaction -> ticket -> event chain
    const getEventPrice = (transaction: Transaction): number | null => {
        if (!transaction.ticket_id) return null;
        const ticket = ticketMap.get(transaction.ticket_id);
        if (!ticket) return null;
        const event = eventMap.get(ticket.event_id);
        if (!event) return null;
        // Extract numeric amount from strings like "300 per team", "500/-"
        const match = event.amount.match(/[0-9.]+/);
        return match ? parseFloat(match[0]) : null;
    };

    // Fetch amount for a single user from Razorpay
    const fetchAmount = async (userId: string, paymentId: string) => {
        setAmounts(prev => {
            const newMap = new Map(prev);
            newMap.set(userId, { loading: true });
            return newMap;
        });

        const result = await fetchPaymentDetails(paymentId);

        if (result.success && result.payment) {
            setAmounts(prev => {
                const newMap = new Map(prev);
                newMap.set(userId, {
                    amount: result.payment!.amount,
                    status: result.payment!.status,
                    method: result.payment!.method,
                    loading: false
                });
                return newMap;
            });
        } else {
            setAmounts(prev => {
                const newMap = new Map(prev);
                newMap.set(userId, {
                    error: result.error || 'Failed to fetch',
                    loading: false
                });
                return newMap;
            });
        }
    };

    // Fetch amounts for ALL transactions from Razorpay (not just user-linked)
    const fetchAllAmounts = async () => {
        if (isFetchingAll) return; // Prevent multiple fetches
        setIsFetchingAll(true);

        for (const transaction of transactions) {
            // Only fetch if transition_id exists AND hasn't been fetched before
            // Skip transactions without payment IDs (no payment made)
            if (transaction.transition_id && !amounts.has(transaction.$id)) {
                // Fetch using transaction $id as key
                setAmounts(prev => {
                    const newMap = new Map(prev);
                    newMap.set(transaction.$id, { loading: true });
                    return newMap;
                });

                const result = await fetchPaymentDetails(transaction.transition_id);

                if (result.success && result.payment) {
                    setAmounts(prev => {
                        const newMap = new Map(prev);
                        newMap.set(transaction.$id, {
                            amount: result.payment!.amount,
                            status: result.payment!.status,
                            method: result.payment!.method,
                            loading: false
                        });
                        return newMap;
                    });
                } else {
                    // If payment ID is available, don't fall back to event price - show error instead
                    setAmounts(prev => {
                        const newMap = new Map(prev);
                        newMap.set(transaction.$id, {
                            error: result.error || 'Failed to fetch',
                            loading: false
                        });
                        return newMap;
                    });
                }
                // Small delay to avoid Razorpay rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        setIsFetchingAll(false);
    };

    // Auto-fetch all amounts on page load
    useEffect(() => {
        // Try to load from localStorage first
        const cachedAmounts = localStorage.getItem('razorpay_amounts_users');
        let initialAmounts = new Map<string, AmountData>();
        
        if (cachedAmounts) {
            try {
                const parsed = JSON.parse(cachedAmounts);
                initialAmounts = new Map(Object.entries(parsed));
                setAmounts(initialAmounts);
            } catch (error) {
                console.warn('Failed to load cached amounts:', error);
            }
        }

        // Always fetch amounts for transactions that haven't been fetched yet
        // This ensures we get complete data even if cache was incomplete
        if (transactions.length > 0 && !isFetchingAll) {
            fetchAllAmounts();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Save amounts to localStorage whenever they change
    useEffect(() => {
        if (amounts.size > 0) {
            try {
                const toStore = Object.fromEntries(amounts);
                localStorage.setItem('razorpay_amounts_users', JSON.stringify(toStore));
            } catch (error) {
                console.warn('Failed to save amounts to localStorage:', error);
            }
        }
    }, [amounts]);

    // Export to Excel function
    const exportToExcel = () => {
        // Create CSV content
        const headers = ['Name', 'Email', 'Phone', 'College', 'Transaction ID', 'Amount Paid', 'Payment Status', 'Payment Method'];

        const rows = initialData.map(user => {
            const transaction = userTransactionMap.get(user.$id);
            // Look up amount by transaction $id (not user $id)
            const amountData = transaction ? amounts.get(transaction.$id) : undefined;

            return [
                user.name || '',
                user.email || '',
                user.phone?.toString() || '',
                user.college || '',
                transaction?.transition_id || '',
                amountData?.amount !== undefined ? `₹${amountData.amount.toFixed(2)}` : '',
                amountData?.status || '',
                amountData?.method || ''
            ];
        });

        // Create CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // Calculate total revenue from fetched Razorpay amounts
    const totalRevenue = Array.from(amounts.values()).reduce((sum, item) => sum + (item.amount || 0), 0);
    const fetchedCount = amounts.size; // Count all attempts (success + errors)
    const successfulCount = Array.from(amounts.values()).filter(a => a.amount !== undefined).length;

    // Custom render function for the amount column
    const renderAmount = (user: User) => {
        const transaction = userTransactionMap.get(user.$id);
        const ticketCount = userTicketCountMap.get(user.$id) || 0;
        
        // If no transaction, show that they haven't paid yet
        if (!transaction) {
            if (ticketCount === 0) {
                return <span className="text-gray-500">-</span>;
            }
            return (
                <div className="flex flex-col">
                    <span className="text-orange-400 text-xs">No payment</span>
                    <span className="text-gray-500 text-xs">{ticketCount} ticket(s) issued</span>
                </div>
            );
        }

        // Look up amount by transaction $id (not user $id)
        const amountData = amounts.get(transaction.$id);

        if (amountData?.loading) {
            return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
        }

        if (amountData?.amount !== undefined) {
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-green-400">
                        ₹{amountData.amount.toFixed(2)}
                    </span>
                    {amountData.status && (
                        <span className={`text-xs ${amountData.status === 'captured' ? 'text-green-500' : 'text-yellow-500'}`}>
                            {amountData.status}
                        </span>
                    )}
                </div>
            );
        }

        if (amountData?.error) {
            return (
                <div className="flex items-center gap-1">
                    <span className="text-red-400 text-xs">{amountData.error}</span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchAmount(transaction.$id, transaction.transition_id);
                        }}
                    >
                        <RefreshCw className="h-3 w-3 text-gray-400" />
                    </Button>
                </div>
            );
        }

        return (
            <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
                onClick={(e) => {
                    e.stopPropagation();
                    fetchAmount(user.$id, transaction.transition_id);
                }}
            >
                <IndianRupee className="h-3 w-3 mr-1" />
                Fetch
            </Button>
        );
    };

    // Render transaction ID for user
    const handleEditTransactionId = (user: User) => {
        const transaction = userTransactionMap.get(user.$id);
        if (transaction) {
            setSelectedTransaction(transaction);
            setTransactionIdInput(transaction.transition_id);
            setIsEditTransactionOpen(true);
        }
    };

    const handleSaveTransactionId = async () => {
        if (!selectedTransaction || !transactionIdInput.trim()) {
            alert('Transaction ID cannot be empty');
            return;
        }

        try {
            await updateItem('transactions', selectedTransaction.$id, {
                transition_id: transactionIdInput.trim()
            });
            
            await logAdminAction('UPDATE', 'transactions', selectedTransaction.$id);
            
            setIsEditTransactionOpen(false);
            setSelectedTransaction(null);
            setTransactionIdInput('');
            
            // Refresh page to show updated data
            router.refresh();
        } catch (error) {
            console.error('Error updating transaction ID:', error);
            alert('Failed to update transaction ID');
        }
    };

    const renderTransactionId = (user: User) => {
        const transaction = userTransactionMap.get(user.$id);
        if (!transaction) {
            return <span className="text-gray-500">-</span>;
        }
        return (
            <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-300">
                    {transaction.transition_id.slice(0, 12)}...
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300"
                    onClick={() => handleEditTransactionId(user)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </Button>
            </div>
        );
    };

    const columns: { key: keyof User; label: string; sortable?: boolean; multiline?: boolean }[] = [
        { key: "name", label: "Name", sortable: true },
        { key: "email", label: "Email", sortable: true },
        { key: "phone", label: "Phone" },
        { key: "college", label: "College", sortable: true },
        { key: "pass", label: "Pass" },
        { key: "tickets", label: "Tickets", multiline: true },
        { key: "certificates", label: "Certificates", multiline: true },
        { key: "$id", label: "ID" },
    ];

    const handleDeleteClick = (item: any) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setFormData(item);
        setIsEditOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedItem) {
            await deleteItem('users', selectedItem.$id);
            await logAdminAction({
                action: `Deleted user: ${selectedItem.name}`,
                actionType: 'delete',
                resource: 'users',
                resourceid: selectedItem.$id,
                details: `Deleted user ${selectedItem.name} (${selectedItem.email})`
            });
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let result;

        const dataToSave = { ...formData };

        // Convert phone to integer if provided
        if (dataToSave.phone) {
            const phoneNumber = parseInt(dataToSave.phone.toString().replace(/\D/g, ''), 10);
            if (isNaN(phoneNumber)) {
                alert("Invalid phone number format");
                return;
            }
            dataToSave.phone = phoneNumber;
        }

        // Hash password if provided
        if (dataToSave.pass) {
            const salt = await bcrypt.genSalt(10);
            dataToSave.pass = await bcrypt.hash(dataToSave.pass, salt);
        } else if (selectedItem?.$id) {
            // If editing and no password provided, remove it from the update data
            delete dataToSave.pass;
        }

        if (selectedItem && selectedItem.$id) {
            result = await updateItem('users', selectedItem.$id, dataToSave);
            if (result.success) {
                await logAdminAction({
                    action: `Updated user: ${dataToSave.name}`,
                    actionType: 'update',
                    resource: 'users',
                    resourceid: selectedItem.$id,
                    details: `Updated user ${dataToSave.name} (${dataToSave.email})`
                });
            }
        } else {
            result = await createItem('users', dataToSave);
            if (result.success) {
                await logAdminAction({
                    action: `Created user: ${dataToSave.name}`,
                    actionType: 'create',
                    resource: 'users',
                    details: `Created new user ${dataToSave.name} (${dataToSave.email})`
                });
            }
        }

        if (result.success) {
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({});
        } else {
            alert("Failed to save user. Check console for details.");
            console.error(result.error);
        }
    };

    const handleOverview = () => {
        const totalUsers = initialData.length;
        const usersWithTickets = initialData.filter(u => u.tickets && u.tickets.length > 0).length;
        const usersWithCerts = initialData.filter(u => u.certificates && u.certificates.length > 0).length;

        // Ticket Distribution for Bar Chart
        const ticketCountMap = new Map<string, number>();
        initialData.forEach(u => {
            const count = (u.tickets?.length || 0).toString();
            ticketCountMap.set(`${count} Tickets`, (ticketCountMap.get(`${count} Tickets`) || 0) + 1);
        });
        const chartData = Array.from(ticketCountMap.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => parseInt(a.label) - parseInt(b.label));

        const report = `
            User Engagement Report for ${totalUsers} users.
            
            Engagement Metrics:
            - Users with active tickets: ${usersWithTickets} (${((usersWithTickets / totalUsers || 0) * 100).toFixed(1)}%)
            - Users with certificates: ${usersWithCerts} (${((usersWithCerts / totalUsers || 0) * 100).toFixed(1)}%)
            
            Key Insights:
            - Most users have ${chartData.sort((a, b) => b.value - a.value)[0]?.label.toLowerCase() || '0 tickets'}.
            - Total tickets assigned across all users: ${initialData.reduce((sum, u) => sum + (u.tickets?.length || 0), 0)}.
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Users', value: totalUsers },
                { label: 'With Tickets', value: usersWithTickets },
                { label: 'With Certs', value: usersWithCerts },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    Users
                </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={total}
                    icon={UsersIcon}
                    color="text-cyan-500"
                />
                <StatsCard
                    title="Total Revenue"
                    value={`₹${totalRevenue.toFixed(2)}`}
                    icon={IndianRupee}
                    color="text-green-500"
                    subValue={`${successfulCount} of ${transactions.length} payments found`}
                />
                <div onClick={handleOverview} className="cursor-pointer">
                    <StatsCard
                        title="Overview"
                        value="View Report"
                        icon={BarChart3}
                        color="text-blue-500"
                        subValue="User analytics"
                    />
                </div>
                <div
                    onClick={!isFetchingAll ? fetchAllAmounts : undefined}
                    className={`cursor-pointer ${isFetchingAll ? 'opacity-50' : ''}`}
                >
                    <StatsCard
                        title="Fetch All Amounts"
                        value={isFetchingAll ? "Fetching..." : "Click to Fetch"}
                        icon={isFetchingAll ? Loader2 : RefreshCw}
                        color="text-amber-500"
                        subValue="Get amounts from Razorpay"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button
                    onClick={exportToExcel}
                    className="bg-green-600 hover:bg-green-500 text-white gap-2"
                    disabled={fetchedCount === 0}
                >
                    <Download className="h-4 w-4" />
                    Export to Excel
                </Button>
                <Button
                    onClick={() => { setSelectedItem({} as any); setFormData({}); setIsEditOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3 items-center bg-gray-900/50 rounded-lg border border-gray-800 p-4">
                <div className="w-48">
                    <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value as 'name' | 'email' | 'phone' | 'college' | '$id')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="college">College</option>
                        <option value="$id">User ID</option>
                    </select>
                </div>
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder={`Search by ${searchField === '$id' ? 'User ID' : searchField}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800 border-gray-700 text-gray-300"
                    />
                </div>
                {searchQuery && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-gray-300"
                    >
                        Clear
                    </Button>
                )}
                <div className="text-sm text-gray-400">
                    {initialData.filter(user => {
                        if (!searchQuery.trim()) return true;
                        const fieldValue = searchField === '$id' ? user.$id : user[searchField];
                        if (!fieldValue) return false;
                        return String(fieldValue).toLowerCase().includes(searchQuery.toLowerCase());
                    }).length} of {initialData.length} users
                </div>
            </div>

            {/* Custom Table with Transaction ID and Amount columns */}
            <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Phone</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">College</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Tickets Issued</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Transaction ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Amount Paid</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-blue-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {initialData
                                .filter(user => {
                                    // Search query filter only
                                    if (!searchQuery.trim()) return true;
                                    
                                    const fieldValue = searchField === '$id' ? user.$id : user[searchField];
                                    if (!fieldValue) return false;
                                    
                                    return String(fieldValue).toLowerCase().includes(searchQuery.toLowerCase());
                                })
                                .map((user) => (
                                <tr key={user.$id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-300">{user.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{user.email}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{user.phone || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{user.college || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-purple-300 font-medium">{userTicketCountMap.get(user.$id) || 0}</td>
                                    <td className="px-4 py-3 text-sm">{renderTransactionId(user)}</td>
                                    <td className="px-4 py-3 text-sm">{renderAmount(user)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-cyan-400 hover:text-cyan-300"
                                                onClick={() => handleEditClick(user)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-red-400 hover:text-red-300"
                                                onClick={() => handleDeleteClick(user)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <OverviewModal
                isOpen={isOverviewOpen}
                onClose={() => setIsOverviewOpen(false)}
                title="Users Overview"
                metrics={overviewData.metrics}
                chartData={overviewData.chartData}
                chartType="bar"
                report={overviewData.report}
            />

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirm Deletion"
                description="Are you sure you want to delete this user? This action cannot be undone."
            >
                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title={selectedItem?.$id ? "Edit User" : "Add User"}
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Name</label>
                        <Input
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email</label>
                        <Input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Password</label>
                        <Input
                            type="password"
                            value={formData.pass || ''}
                            onChange={(e) => setFormData({ ...formData, pass: e.target.value })}
                            required={!selectedItem?.$id}
                            placeholder={selectedItem?.$id ? "Unchanged" : "Required"}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Phone</label>
                        <Input
                            type="tel"
                            value={formData.phone?.toString() || ''}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value as any })}
                            required
                            placeholder="Phone number (digits only)"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">College</label>
                        <Input
                            value={formData.college || ''}
                            onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                            placeholder="College name (optional)"
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">Save</Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Transaction ID Modal */}
            <Modal
                isOpen={isEditTransactionOpen}
                onClose={() => {
                    setIsEditTransactionOpen(false);
                    setSelectedTransaction(null);
                    setTransactionIdInput('');
                }}
                title="Edit Transaction ID"
                description="Update the transaction ID for this user"
            >
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Transaction ID</label>
                        <Input
                            value={transactionIdInput}
                            onChange={(e) => setTransactionIdInput(e.target.value)}
                            placeholder="Enter transaction ID"
                            className="bg-white/5 border-white/10 font-mono"
                        />
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-xs text-blue-300">
                        💡 This is the Razorpay payment ID or transition link ID
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsEditTransactionOpen(false);
                                setSelectedTransaction(null);
                                setTransactionIdInput('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveTransactionId}
                            className="bg-cyan-500 text-black hover:bg-cyan-400"
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
