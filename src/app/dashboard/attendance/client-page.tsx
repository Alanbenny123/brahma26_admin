'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { deleteItem, updateItem, createItem } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { ClipboardCheck, BarChart3, Plus } from "lucide-react";

interface AttendanceType {
    $id: string;
    event_id: string;
    ticket_id: string;
    stud_id: string;
}

export default function ClientAttendancePage({ initialData, total }: { initialData: any[], total: number }) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AttendanceType | null>(null);
    const [formData, setFormData] = useState<Partial<AttendanceType>>({});

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    const columns: { key: keyof AttendanceType; label: string; sortable?: boolean }[] = [
        { key: "event_id", label: "Event ID", sortable: true },
        { key: "stud_id", label: "Student ID", sortable: true },
        { key: "ticket_id", label: "Ticket ID" },
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
            await deleteItem('attendance', selectedItem.$id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedItem && selectedItem.$id) {
            await updateItem('attendance', selectedItem.$id, formData);
        } else {
            await createItem('attendance', formData);
        }
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormData({});
    };

    const handleOverview = () => {
        const totalRecords = initialData.length;
        const uniqueStudents = new Set(initialData.map(a => a.stud_id)).size;
        const uniqueEvents = new Set(initialData.map(a => a.event_id)).size;

        // Attendance per Event for Bar Chart
        const eventMap = new Map<string, number>();
        initialData.forEach(a => {
            eventMap.set(a.event_id, (eventMap.get(a.event_id) || 0) + 1);
        });
        const chartData = Array.from(eventMap.entries()).map(([label, value]) => ({ label, value }));

        const report = `
            Attendance Analysis Report.
            
            Overall Stats:
            - Total Attendance Records: ${totalRecords}
            - Unique Students Attended: ${uniqueStudents}
            - Number of Events Covered: ${uniqueEvents}
            
            Key Insights:
            - Average attendance per event: ${(totalRecords / (uniqueEvents || 1)).toFixed(1)}
            - Event with highest attendance: ${chartData.sort((a, b) => b.value - a.value)[0]?.label || 'N/A'}
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Records', value: totalRecords },
                { label: 'Unique Students', value: uniqueStudents },
                { label: 'Unique Events', value: uniqueEvents },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500">
                    Attendance
                </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Records"
                    value={total}
                    icon={ClipboardCheck}
                    color="text-emerald-500"
                />
                <div onClick={handleOverview} className="cursor-pointer">
                    <StatsCard
                        title="Overview"
                        value="View Report"
                        icon={BarChart3}
                        color="text-green-500"
                        subValue="Visual analysis"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={() => { setSelectedItem({} as any); setFormData({}); setIsEditOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Record
                </Button>
            </div>

            <DataTable
                data={initialData}
                columns={columns}
                searchKeys={["stud_id", "event_id", "ticket_id"]}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                placeholder="Search by student, event or ticket..."
                headerColor="text-emerald-400"
            />

            <OverviewModal
                isOpen={isOverviewOpen}
                onClose={() => setIsOverviewOpen(false)}
                title="Attendance Overview"
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
                description="Delete this attendance record?"
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
                title={selectedItem?.$id ? "Edit Attendance" : "Add Attendance"}
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Student ID</label>
                        <Input
                            value={formData.stud_id || ''}
                            onChange={(e) => setFormData({ ...formData, stud_id: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Event ID</label>
                        <Input
                            value={formData.event_id || ''}
                            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Ticket ID</label>
                        <Input
                            value={formData.ticket_id || ''}
                            onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
                            required
                        />
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
