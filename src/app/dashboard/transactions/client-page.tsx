'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Edit, Plus, Receipt, BarChart3 } from "lucide-react";
import { deleteItem, updateItem, createItem } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";

interface TransactionType {
    $id: string;
    transition_id: string;
    stud_id?: string;
    ticket_id?: string;
}

interface ClientTransactionsPageProps {
    initialData: TransactionType[];
    total: number;
}

export default function ClientTransactionsPage({ initialData, total }: ClientTransactionsPageProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TransactionType | null>(null);
    const [formData, setFormData] = useState<Partial<TransactionType>>({});

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    const columns: { key: keyof TransactionType; label: string; sortable?: boolean }[] = [
        { key: "$id", label: "Transaction ID", sortable: true },
        { key: "transition_id", label: "Transition ID", sortable: true },
        { key: "stud_id", label: "Student ID", sortable: true },
        { key: "ticket_id", label: "Ticket ID", sortable: true },
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
            await deleteItem('transactions', selectedItem.$id);
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
            await updateItem('transactions', selectedItem.$id, formData);
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
            
            Key Insights:
            - ${((complete / totalTransactions || 0) * 100).toFixed(1)}% of transactions are complete (have both stud_id and ticket_id).
            - ${((withStudId / totalTransactions || 0) * 100).toFixed(1)}% have student ID information.
            - ${((withTicketId / totalTransactions || 0) * 100).toFixed(1)}% have ticket ID information.
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Transactions', value: totalTransactions },
                { label: 'Complete', value: complete },
                { label: 'With Student ID', value: withStudId },
                { label: 'With Ticket ID', value: withTicketId },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    const handleDeleteMany = async (items: TransactionType[]) => {
        if (confirm(`Are you sure you want to delete ${items.length} transactions?`)) {
            await Promise.all(items.map(item => deleteItem('transactions', item.$id)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Transactions"
                    value={total}
                    icon={Receipt}
                    color="text-purple-500"
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
            </div>

            <DataTable
                data={initialData}
                columns={columns}
                searchKeys={["transition_id", "stud_id", "ticket_id", "$id"]}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onDeleteMany={handleDeleteMany}
                placeholder="Search by ID..."
                headerColor="text-purple-400"
            />

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
