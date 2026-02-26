'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Trash2, Edit, Plus, Receipt, BarChart3, IndianRupee, Loader2, RefreshCw } from "lucide-react";
import { deleteFirestoreTransaction, updateFirestoreTransaction, createFirestoreTransaction } from "@/actions/firebase";
import { StatsCard } from "@/components/dashboard/stats-card";
import { useActivityLogger } from "@/lib/use-activity-logger";
import { fetchPaymentDetails } from "@/actions/razorpay";

interface TransactionType {
    $id: string;
    transition_id: string;
    stud_id?: string;
    ticket_id?: string;
    amount?: number;
}

interface AmountData {
    amount?: number;
    status?: string;
    method?: string;
    loading?: boolean;
    error?: string;
}

interface ClientTransactionsPageProps {
    initialData: TransactionType[];
    total: number;
}

export default function ClientTransactionsPage({ initialData, total }: ClientTransactionsPageProps) {
    // Log page view
    useActivityLogger();

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TransactionType | null>(null);
    const [formData, setFormData] = useState<Partial<TransactionType>>({});

    // Amount fetching state - stores Razorpay data keyed by transaction $id
    const [amounts, setAmounts] = useState<Map<string, AmountData>>(new Map());
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    // Track fetched transition_ids to prevent duplicate API calls to Razorpay
    const [fetchedTransitionIds, setFetchedTransitionIds] = useState<Set<string>>(new Set());

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchField, setSearchField] = useState<'$id' | 'transition_id' | 'stud_id' | 'ticket_id'>('$id');

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    // Fetch amount for a single transaction from Razorpay
    // Only fetches if the transition_id hasn't been fetched before (prevents duplicate API calls)
    const fetchAmount = async (transactionId: string, paymentId: string) => {
        // Check if this transition_id has already been fetched
        if (fetchedTransitionIds.has(paymentId)) {
            // Already fetched, don't make another request
            return;
        }

        setAmounts(prev => {
            const newMap = new Map(prev);
            newMap.set(transactionId, { loading: true });
            return newMap;
        });

        // Mark this transition_id as being fetched to prevent duplicates
        setFetchedTransitionIds(prev => new Set(prev).add(paymentId));

        const result = await fetchPaymentDetails(paymentId);

        if (result.success && result.payment) {
            setAmounts(prev => {
                const newMap = new Map(prev);
                newMap.set(transactionId, {
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
                newMap.set(transactionId, {
                    error: result.error || 'Failed to fetch',
                    loading: false
                });
                return newMap;
            });
        }
    };

    // Fetch amounts for all transactions from Razorpay
    // Uses transition_id to prevent duplicate fetches - each transition_id is only fetched once
    const fetchAllAmounts = async () => {
        setIsFetchingAll(true);

        for (const transaction of initialData) {
            // Only fetch if transition_id exists AND hasn't been fetched before
            if (transaction.transition_id && !fetchedTransitionIds.has(transaction.transition_id)) {
                await fetchAmount(transaction.$id, transaction.transition_id);
                // Small delay to avoid Razorpay rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        setIsFetchingAll(false);
    };

    // Auto-fetch all amounts on page load
    useEffect(() => {
        // Try to load from localStorage first
        const cachedAmounts = localStorage.getItem('razorpay_amounts_transactions');
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
        if (initialData.length > 0 && !isFetchingAll) {
            fetchAllAmounts();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Save amounts to localStorage whenever they change
    useEffect(() => {
        if (amounts.size > 0) {
            try {
                const toStore = Object.fromEntries(amounts);
                localStorage.setItem('razorpay_amounts_transactions', JSON.stringify(toStore));
            } catch (error) {
                console.warn('Failed to save amounts to localStorage:', error);
            }
        }
    }, [amounts]);

    // Calculate total revenue from fetched Razorpay amounts
    const totalRevenue = Array.from(amounts.values()).reduce((sum, item) => sum + (item.amount || 0), 0);
    const fetchedCount = amounts.size; // Count all attempts (success + errors)
    const successfulCount = Array.from(amounts.values()).filter(a => a.amount !== undefined).length;

    // Custom render function for the amount column
    const renderAmount = (item: TransactionType) => {
        // Check if transition_id exists first
        if (!item.transition_id) {
            return <span className="text-orange-400 text-xs">No ID</span>;
        }

        const amountData = amounts.get(item.$id);

        if (amountData?.loading) {
            return <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />;
        }

        if (amountData?.amount !== undefined) {
            return (
                <div className="flex flex-col">
                    <span className="text-green-400 font-medium">
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
                    <span className="text-red-400 text-xs" title={amountData.error}>{amountData.error}</span>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            fetchAmount(item.$id, item.transition_id);
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
                    fetchAmount(item.$id, item.transition_id);
                }}
            >
                <IndianRupee className="h-3 w-3 mr-1" />
                Fetch
            </Button>
        );
    };

    const columns: { key: keyof TransactionType; label: string; sortable?: boolean }[] = [
        { key: "$id", label: "ID", sortable: true },
        { key: "transition_id", label: "Transaction ID", sortable: true },
        { key: "stud_id", label: "Student ID", sortable: true },
        { key: "ticket_id", label: "Ticket ID", sortable: true },
    ];

    // Filter data based on search query and selected field
    const filteredData = initialData.filter(item => {
        if (!searchQuery.trim()) return true;
        
        const fieldValue = item[searchField];
        if (!fieldValue) return false;
        
        return fieldValue.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Transform data to include rendered amounts
    const dataWithAmounts = filteredData.map(item => ({
        ...item,
        _amountRender: renderAmount(item)
    }));

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
            await deleteFirestoreTransaction(selectedItem.$id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate transition_id
        if (!formData.transition_id || !formData.transition_id.trim()) {
            alert('Transition ID is required');
            return;
        }

        if (formData.transition_id.length > 60) {
            alert('Transition ID must be max 60 characters');
            return;
        }

        if (formData.stud_id && formData.stud_id.length > 50) {
            alert('Student ID must be max 50 characters');
            return;
        }

        if (formData.ticket_id && formData.ticket_id.length > 50) {
            alert('Ticket ID must be max 50 characters');
            return;
        }

        if (selectedItem && selectedItem.$id) {
            await updateFirestoreTransaction(selectedItem.$id, formData);
        }
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormData({});
    };

    const handleOverview = () => {
        const totalTransactions = initialData.length;
        const withStudId = initialData.filter(t => t.stud_id).length;
        const withTicketId = initialData.filter(t => t.ticket_id).length;
        const complete = initialData.filter(t => t.stud_id && t.ticket_id).length;
        
        const errorCount = Array.from(amounts.values()).filter(a => a.error).length;
        const noTransitionId = initialData.filter(t => !t.transition_id).length;

        const chartData = [
            { label: 'Complete', value: complete, color: '#22c55e' }, // green-500
            { label: 'Partial', value: totalTransactions - complete, color: '#f59e0b' } // amber-500
        ];

        const report = `
            Overview Report for ${totalTransactions} transactions.
            
            Metrics:
            - Complete Transactions: ${complete}
            - With Student ID: ${withStudId}
            - With Ticket ID: ${withTicketId}
            - Partial Transactions: ${totalTransactions - complete}
            - Fetched from Razorpay: ${fetchedCount}
            - Successful Payments Found: ${successfulCount}
            - Invalid/Missing IDs: ${errorCount}
            - No Transition ID: ${noTransitionId}
            - Total Revenue (fetched): ₹${totalRevenue.toFixed(2)}
            
            Key Insights:
            - ${((complete / totalTransactions || 0) * 100).toFixed(1)}% of transactions are complete (have both stud_id and ticket_id).
            - ${((withStudId / totalTransactions || 0) * 100).toFixed(1)}% have student ID information.
            - ${((withTicketId / totalTransactions || 0) * 100).toFixed(1)}% have ticket ID information.
            - ${((successfulCount / totalTransactions || 0) * 100).toFixed(1)}% have valid Razorpay payment IDs.
            - ${((errorCount / totalTransactions || 0) * 100).toFixed(1)}% have invalid or non-existent payment IDs.
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Transactions', value: totalTransactions },
                { label: 'Complete', value: complete },
                { label: 'With Student ID', value: withStudId },
                { label: 'With Ticket ID', value: withTicketId },
                { label: 'Valid Payment IDs', value: successfulCount },
                { label: 'Invalid IDs', value: errorCount },
                { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}` },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    const handleDeleteMany = async (items: TransactionType[]) => {
        if (confirm(`Are you sure you want to delete ${items.length} transactions?`)) {
            await Promise.all(items.map(item => deleteFirestoreTransaction(item.$id)));
        }
    };

    return (
        <div className="space-y-6">
            {/* Warning when not all payments are fetched */}
            {successfulCount < total && successfulCount > 0 && (
                <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 text-amber-200 text-sm">
                    <p className="font-semibold mb-1">⚠️ Incomplete Data</p>
                    <p>Only {successfulCount} of {total} payment amounts have been fetched. The total revenue shown (₹{totalRevenue.toFixed(2)}) is incomplete.</p>
                    <p className="text-xs text-amber-300 mt-2">Missing: {total - successfulCount} payments. The actual total may be higher.</p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Transactions"
                    value={total}
                    icon={Receipt}
                    color="text-purple-500"
                />
                <StatsCard
                    title="Total Revenue"
                    value={`₹${totalRevenue.toFixed(2)}`}
                    icon={IndianRupee}
                    color="text-green-500"
                    subValue={`${successfulCount} of ${total} payments found`}
                />
                <div onClick={handleOverview} className="cursor-pointer">
                    <StatsCard
                        title="Overview"
                        value="View Report"
                        icon={BarChart3}
                        color="text-cyan-500"
                        subValue="Graphic analysis"
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

            {/* Search Bar */}
            <div className="flex gap-3 items-center bg-gray-900/50 rounded-lg border border-gray-800 p-4">
                <div className="w-48">
                    <select
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value as '$id' | 'transition_id' | 'stud_id' | 'ticket_id')}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="$id">ID</option>
                        <option value="transition_id">Transaction ID</option>
                        <option value="stud_id">Student ID</option>
                        <option value="ticket_id">Ticket ID</option>
                    </select>
                </div>
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder={`Search by ${searchField === '$id' ? 'ID' : searchField === 'transition_id' ? 'Transaction ID' : searchField === 'stud_id' ? 'Student ID' : 'Ticket ID'}...`}
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
                    {filteredData.length} of {initialData.length} transactions
                </div>
            </div>

            {/* Amount Column Display */}
            <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">Transaction ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">Student ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">Ticket ID</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">Amount (Razorpay)</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-purple-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredData.map((item) => (
                                <tr key={item.$id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-sm text-gray-300 font-mono">{item.$id.slice(0, 8)}...</td>
                                    <td className="px-4 py-3 text-sm text-gray-300 font-mono">{item.transition_id}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{item.stud_id || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-300">{item.ticket_id || '-'}</td>
                                    <td className="px-4 py-3 text-sm">{renderAmount(item)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-cyan-400 hover:text-cyan-300"
                                                onClick={() => handleEditClick(item)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-2 text-red-400 hover:text-red-300"
                                                onClick={() => handleDeleteClick(item)}
                                            >
                                                <Trash2 className="h-3 w-3" />
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
                title="Transactions Overview"
                metrics={overviewData.metrics}
                chartData={overviewData.chartData}
                chartType="pie"
                report={overviewData.report}
            />

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirm Deletion"
                description="Delete this transaction?"
            >
                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setFormData({});
                }}
                title="Edit Transaction"
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">
                            Transition ID <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={formData.transition_id || ''}
                            onChange={(e) => setFormData({ ...formData, transition_id: e.target.value })}
                            maxLength={60}
                            placeholder="Enter transition ID"
                        />
                        <p className="text-xs text-gray-500">Max 60 characters</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Student ID</label>
                        <Input
                            value={formData.stud_id || ''}
                            onChange={(e) => setFormData({ ...formData, stud_id: e.target.value })}
                            maxLength={50}
                            placeholder="Enter student ID (optional)"
                        />
                        <p className="text-xs text-gray-500">Max 50 characters</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Ticket ID</label>
                        <Input
                            value={formData.ticket_id || ''}
                            onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
                            maxLength={50}
                            placeholder="Enter ticket ID (optional)"
                        />
                        <p className="text-xs text-gray-500">Max 50 characters</p>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsEditOpen(false);
                                setFormData({});
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">
                            Save
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
