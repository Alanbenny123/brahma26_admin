'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Edit, Plus, Ticket, BarChart3 } from "lucide-react";
import { deleteItem, updateItem, createItem } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Checkbox } from "@/components/ui/checkbox"; // Will create simplified checkbox here or import

interface TicketType {
    $id: string;
    event_id: string;
    active: boolean;
    team_name?: string;
    stud_id?: string[];
    // Extended fields
    event_name?: string;
    fest?: string;
    amount?: number;
}

interface ClientTicketsPageProps {
    initialData: TicketType[];
    events: any[];
    total: number;
}

export default function ClientTicketsPage({ initialData, events, total }: ClientTicketsPageProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TicketType | null>(null);
    const [formData, setFormData] = useState<Partial<TicketType>>({});

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    const columns: { key: keyof TicketType; label: string; sortable?: boolean }[] = [
        { key: "event_name", label: "Event Name", sortable: true },
        { key: "fest", label: "Fest", sortable: true },
        { key: "event_id", label: "Event ID", sortable: true },
        { key: "team_name", label: "Team Name", sortable: true },
        { key: "$id", label: "Ticket ID" },
        { key: "active", label: "Active" },
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
            await deleteItem('tickets', selectedItem.$id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            active: formData.active ?? true // Default to true if undefined
        };

        if (selectedItem && selectedItem.$id) {
            await updateItem('tickets', selectedItem.$id, dataToSave);
        } else {
            await createItem('tickets', dataToSave);
        }
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormData({});
    };

    const handleOverview = () => {
        const totalTickets = initialData.length;
        const activeTickets = initialData.filter(t => t.active).length;
        const inactiveTickets = totalTickets - activeTickets;

        // Distribution for Pie Chart
        const chartData = [
            { label: 'Active', value: activeTickets, color: '#22c55e' }, // green-500
            { label: 'Inactive', value: inactiveTickets, color: '#ef4444' } // red-500
        ];

        const report = `
            Overview Report for ${totalTickets} tickets.
            
            Metrics:
            - Active Tickets: ${activeTickets}
            - Inactive Tickets: ${inactiveTickets}
            
            Key Insights:
            - ${((activeTickets / totalTickets || 0) * 100).toFixed(1)}% of all tickets are currently active.
            - Total associated events (unique): ${new Set(initialData.map(t => t.event_id)).size}.
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Tickets', value: totalTickets },
                { label: 'Active', value: activeTickets },
                { label: 'Inactive', value: inactiveTickets },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    const handleDeleteMany = async (items: TicketType[]) => {
        if (confirm(`Are you sure you want to delete ${items.length} tickets?`)) {
            await Promise.all(items.map(item => deleteItem('tickets', item.$id)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Tickets"
                    value={total}
                    icon={Ticket}
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
                searchKeys={["event_name", "event_id", "$id"]}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onDeleteMany={handleDeleteMany}
                placeholder="Search by event or ID..."
                headerColor="text-purple-400"
            />

            <OverviewModal
                isOpen={isOverviewOpen}
                onClose={() => setIsOverviewOpen(false)}
                title="Tickets Overview"
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
                description="Delete this ticket?"
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
                title="Edit Ticket"
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Team Name</label>
                        <Input
                            value={formData.team_name || ''}
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={formData.active || false}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="h-4 w-4 bg-white/5 border-white/10 rounded"
                        />
                        <label className="text-sm text-gray-400">Active</label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
