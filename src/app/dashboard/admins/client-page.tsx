'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Plus, Shield, UserCog } from "lucide-react";
import { deleteAdmin, createAdmin, updateAdmin } from "@/actions/auth";
import { StatsCard } from "@/components/dashboard/stats-card";

interface AdminType {
    $id: string;
    email: string;
    pass: string;
    log_in?: string;
    log_out?: string;
    session_token?: string | null;
    $createdAt: string;
}

interface ClientAdminsPageProps {
    initialData: AdminType[];
    total: number;
}

export default function ClientAdminsPage({ initialData, total }: ClientAdminsPageProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AdminType | null>(null);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const columns: { key: keyof AdminType; label: string; sortable?: boolean }[] = [
        { key: "email", label: "Email", sortable: true },
        { key: "$id", label: "Admin ID", sortable: true },
        { key: "$createdAt", label: "Created At", sortable: true },
        { key: "log_in", label: "Last Login", sortable: true },
        { key: "log_out", label: "Last Logout", sortable: true },
    ];

    // Format data for display (hide password hash and session token)
    const processedAdmins = initialData.map(admin => ({
        ...admin,
        pass: '********', // Hide password hash in table
        session_token: undefined, // Remove session token from display
    }));

    const handleDeleteClick = (item: any) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleCreateClick = () => {
        setFormData({ email: '', password: '' });
        setError('');
        setIsCreateOpen(true);
    };

    const handleEditClick = (item: any) => {
        // Find the original item from initialData to get the real email
        const originalItem = initialData.find(admin => admin.$id === item.$id);
        setSelectedItem(originalItem || item);
        setFormData({ email: originalItem?.email || item.email, password: '' });
        setError('');
        setIsEditOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedItem) {
            setIsLoading(true);
            const result = await deleteAdmin(selectedItem.$id);
            setIsLoading(false);
            
            if (!result.success) {
                alert(result.error || 'Failed to delete admin');
            } else {
                setIsDeleteOpen(false);
                setSelectedItem(null);
                window.location.reload(); // Refresh to show updated list
            }
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const formDataObj = new FormData();
        formDataObj.append('email', formData.email);
        formDataObj.append('password', formData.password);

        const result = await createAdmin(formDataObj);
        setIsLoading(false);

        if (!result.success) {
            setError(result.error || 'Failed to create admin');
        } else {
            setIsCreateOpen(false);
            setFormData({ email: '', password: '' });
            window.location.reload(); // Refresh to show new admin
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        setError('');
        setIsLoading(true);

        const formDataObj = new FormData();
        formDataObj.append('email', formData.email);
        if (formData.password) {
            formDataObj.append('password', formData.password);
        }

        const result = await updateAdmin(selectedItem.$id, formDataObj);
        setIsLoading(false);

        if (!result.success) {
            setError(result.error || 'Failed to update admin');
        } else {
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({ email: '', password: '' });
            window.location.reload(); // Refresh to show updated admin
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                    title="Total Admins"
                    value={total}
                    icon={Shield}
                    color="text-purple-500"
                />
                <div onClick={handleCreateClick} className="cursor-pointer">
                    <StatsCard
                        title="Add New Admin"
                        value="Create"
                        icon={Plus}
                        color="text-green-500"
                        subValue="Add administrator"
                    />
                </div>
            </div>

            <DataTable
                data={processedAdmins}
                columns={columns}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
                searchKeys={["email", "$id"]}
            />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Admin">
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Are you sure you want to delete admin <strong>{selectedItem?.email}</strong>?
                    </p>
                    <p className="text-sm text-red-400">
                        ⚠️ This action cannot be undone. The admin will lose all access immediately.
                    </p>
                    <div className="flex space-x-2 justify-end">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsDeleteOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={confirmDelete}
                            disabled={isLoading}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            {isLoading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Create Admin Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add New Admin">
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email</label>
                        <Input
                            type="email"
                            placeholder="admin@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Password</label>
                        <Input
                            type="password"
                            placeholder="Minimum 6 characters"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                            Password will be securely hashed using bcrypt before storage.
                        </p>
                    </div>

                    <div className="flex space-x-2 justify-end pt-4">
                        <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => setIsCreateOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600"
                        >
                            {isLoading ? 'Creating...' : 'Create Admin'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Admin Modal */}
            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Admin">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email</label>
                        <Input
                            type="email"
                            placeholder="admin@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">New Password (optional)</label>
                        <Input
                            type="password"
                            placeholder="Leave empty to keep current password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500">
                            Leave blank to keep the current password. If provided, it will be hashed with bcrypt.
                        </p>
                    </div>

                    <div className="flex space-x-2 justify-end pt-4">
                        <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => setIsEditOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-500 hover:bg-blue-600"
                        >
                            {isLoading ? 'Updating...' : 'Update Admin'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
