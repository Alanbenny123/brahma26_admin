'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { deleteItem, updateItem, createItem } from "@/actions/appwrite";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/dashboard/stats-card";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Users as UsersIcon, BarChart3, Plus } from "lucide-react";
import bcrypt from "bcryptjs";

// Define the shape of a User based on Appwrite schema
interface User {
    $id: string;
    name: string;
    email: string;
    pass: string;
    certificates?: string[];
    tickets?: string[];
}

interface ClientUsersPageProps {
    initialData: User[];
    total: number;
}

export default function ClientUsersPage({ initialData, total }: ClientUsersPageProps) {
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({});

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    const columns: { key: keyof User; label: string; sortable?: boolean; multiline?: boolean }[] = [
        { key: "name", label: "Name", sortable: true },
        { key: "email", label: "Email", sortable: true },
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
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let result;

        const dataToSave = { ...formData };

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
        } else {
            result = await createItem('users', dataToSave);
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
                <div onClick={handleOverview} className="cursor-pointer">
                    <StatsCard
                        title="Overview"
                        value="View Report"
                        icon={BarChart3}
                        color="text-blue-500"
                        subValue="User analytics"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={() => { setSelectedItem({} as any); setFormData({}); setIsEditOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add User
                </Button>
            </div>

            <DataTable
                data={initialData}
                columns={columns}
                searchKeys={["name", "email", "$id"]}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                placeholder="Search by name, email or ID..."
                headerColor="text-blue-400"
            />

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
                    {/* Add more fields as per schema */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
