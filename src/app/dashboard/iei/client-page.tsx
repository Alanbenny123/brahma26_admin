'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Trash2, Plus, Database, FileCheck, CheckCircle, XCircle } from "lucide-react";
import { deleteFirestoreIEI, createFirestoreIEI, updateFirestoreIEI } from "@/actions/firebase";
import { StatsCard } from "@/components/dashboard/stats-card";
import { formatDate } from "@/lib/date-utils";
import { useActivityLogger } from "@/lib/use-activity-logger";

interface IEIRecord {
    $id: string;
    mebership_id: string;
    validity: boolean;
    $createdAt: string;
}

interface ClientIEIPageProps {
    initialData: IEIRecord[];
    total: number;
}

export default function ClientIEIPage({ initialData, total }: ClientIEIPageProps) {
    useActivityLogger();
    
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IEIRecord | null>(null);
    const [formData, setFormData] = useState({ mebership_id: '', validity: false });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!selectedItem) return;
        setIsLoading(true);
        setError('');
        try {
            await deleteFirestoreIEI(selectedItem.$id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error deleting record');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.mebership_id.trim()) {
            setError('Membership ID is required');
            return;
        }
        
        // Check for duplicate membership ID
        const isDuplicate = initialData.some(
            record => record.mebership_id.toLowerCase() === formData.mebership_id.trim().toLowerCase()
        );
        if (isDuplicate) {
            setError('A record with this membership ID already exists');
            return;
        }
        
        setIsLoading(true);
        setError('');
        try {
            await createFirestoreIEI({
                mebership_id: formData.mebership_id.trim(),
                validity: formData.validity,
            });
            setIsCreateOpen(false);
            setFormData({ mebership_id: '', validity: false });
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error creating record');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedItem || !formData.mebership_id.trim()) {
            setError('Membership ID is required');
            return;
        }
        
        // Check for duplicate membership ID (excluding current record)
        const isDuplicate = initialData.some(
            record => record.$id !== selectedItem.$id && 
                      record.mebership_id.toLowerCase() === formData.mebership_id.trim().toLowerCase()
        );
        if (isDuplicate) {
            setError('A record with this membership ID already exists');
            return;
        }
        
        setIsLoading(true);
        setError('');
        try {
            await updateFirestoreIEI(selectedItem.$id, {
                mebership_id: formData.mebership_id.trim(),
                validity: formData.validity,
            });
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({ mebership_id: '', validity: false });
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error updating record');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModal = (item: IEIRecord) => {
        setSelectedItem(item);
        setFormData({ mebership_id: item.mebership_id, validity: item.validity });
        setIsEditOpen(true);
    };

    const openDeleteModal = (item: IEIRecord) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleToggleValidity = async (item: IEIRecord) => {
        setIsLoading(true);
        try {
            await updateFirestoreIEI(item.$id, {
                mebership_id: item.mebership_id,
                validity: !item.validity,
            });
            window.location.reload();
        } catch (err) {
            console.error('Error toggling validity:', err);
            alert('Failed to update validity status');
        } finally {
            setIsLoading(false);
        }
    };

    // Process data to show validity as a badge
    const processedData = initialData.map(record => ({
        ...record,
        validity: record.validity as any, // Keep the boolean value for sorting/filtering
    }));

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Database className="w-8 h-8 text-cyan-400" />
                        IEI Records
                    </h1>
                    <p className="text-gray-400 mt-1">Manage IEI membership records</p>
                </div>
                <Button
                    onClick={() => {
                        setFormData({ mebership_id: '', validity: false });
                        setError('');
                        setIsCreateOpen(true);
                    }}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Record
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsCard title="Total Records" value={total.toString()} icon={Database} />
                <StatsCard title="Active Records" value={initialData.filter(r => r.validity).length.toString()} icon={FileCheck} />
            </div>

            {/* Data Table */}
            <div className="space-y-4">
                <div className="rounded-md border border-white/10 overflow-hidden bg-black/40 backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr className="border-b border-white/10">
                                    <th className="text-left p-4 text-sm font-medium text-cyan-400">Membership ID</th>
                                    <th className="text-left p-4 text-sm font-medium text-cyan-400">Validity Status</th>
                                    <th className="text-left p-4 text-sm font-medium text-cyan-400">Record ID</th>
                                    <th className="text-left p-4 text-sm font-medium text-cyan-400">Created At</th>
                                    <th className="text-right p-4 text-sm font-medium text-cyan-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedData.length > 0 ? (
                                    processedData.map((record) => (
                                        <tr key={record.$id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-4 text-gray-300">{record.mebership_id}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleToggleValidity(record)}
                                                    disabled={isLoading}
                                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        record.validity
                                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    }`}
                                                >
                                                    {record.validity ? (
                                                        <>
                                                            <CheckCircle className="w-3 h-3" />
                                                            Valid
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3" />
                                                            Invalid
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-4 text-gray-300 text-sm">{record.$id}</td>
                                            <td className="p-4 text-gray-300 text-sm">
                                                {formatDate(record.$createdAt)}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(record)}
                                                    className="hover:text-blue-400"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDeleteModal(record)}
                                                    className="hover:text-red-400"
                                                >
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            No records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Delete Record"
                description={`Are you sure you want to delete the record for membership ID: ${selectedItem?.mebership_id}?`}
            >
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-3 justify-end">
                    <Button
                        onClick={() => setIsDeleteOpen(false)}
                        disabled={isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isLoading ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create IEI Record"
                description="Add a new IEI membership record"
            >
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Membership ID *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter membership ID"
                            value={formData.mebership_id}
                            onChange={(e) => setFormData({ ...formData, mebership_id: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1">
                            <input
                                type="checkbox"
                                checked={formData.validity}
                                onChange={(e) => setFormData({ ...formData, validity: e.target.checked })}
                                disabled={isLoading}
                                className="w-4 h-4 rounded"
                            />
                            Valid
                        </label>
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                    <Button
                        onClick={() => setIsCreateOpen(false)}
                        disabled={isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                        {isLoading ? "Creating..." : "Create"}
                    </Button>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title="Edit IEI Record"
                description={`Editing record: ${selectedItem?.mebership_id}`}
            >
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Membership ID *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter membership ID"
                            value={formData.mebership_id}
                            onChange={(e) => setFormData({ ...formData, mebership_id: e.target.value })}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1">
                            <input
                                type="checkbox"
                                checked={formData.validity}
                                onChange={(e) => setFormData({ ...formData, validity: e.target.checked })}
                                disabled={isLoading}
                                className="w-4 h-4 rounded"
                            />
                            Valid
                        </label>
                    </div>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                    <Button
                        onClick={() => setIsEditOpen(false)}
                        disabled={isLoading}
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                        {isLoading ? "Updating..." : "Update"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
