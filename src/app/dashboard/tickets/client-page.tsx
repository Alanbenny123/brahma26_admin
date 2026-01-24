'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Trash2, Edit, Plus, Ticket, BarChart3, Send, X, AlertCircle, Download } from "lucide-react";
import { deleteItem, updateItem, createItem, issueTicket, cancelTicket, createTicketWithTransactions } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Checkbox } from "@/components/ui/checkbox"; // Will create simplified checkbox here or import
import { useActivityLogger } from "@/lib/use-activity-logger";
import { downloadTicketAsHTML, downloadTicketAsImage, downloadTicketAsCSV, downloadTicketAsPDF } from "@/lib/ticket-export";

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
    usernames?: string;
}

interface ClientTicketsPageProps {
    initialData: TicketType[];
    events: any[];
    users: any[];
    total: number;
}

export default function ClientTicketsPage({ initialData, events, users, total }: ClientTicketsPageProps) {
    // Log page view
    useActivityLogger();
    
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isIssueOpen, setIsIssueOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TicketType | null>(null);
    const [formData, setFormData] = useState<Partial<TicketType>>({});
    const [studentIdToIssue, setStudentIdToIssue] = useState('');
    const [studentIdToCancel, setStudentIdToCancel] = useState('');
    const [initialStudentsInput, setInitialStudentsInput] = useState('');
    const [transactionIdsInput, setTransactionIdsInput] = useState('');
    const [paymentId, setPaymentId] = useState('');
    const [orderId, setOrderId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [newTicketData, setNewTicketData] = useState<{ ticketId: string; eventName: string; eventId: string; teamName?: string } | null>(null);

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

    // Helper function to get usernames for a ticket
    const getUsernamesForTicket = (studIds?: string[]): string => {
        if (!studIds || studIds.length === 0) return '-';
        
        const usernames = studIds.map(studId => {
            const user = users.find((u: any) => u.$id === studId);
            return user?.name || user?.email?.split('@')[0] || studId;
        }).join(', ');
        
        // Truncate if too long
        return usernames.length > 50 ? usernames.substring(0, 47) + '...' : usernames;
    };

    // Transform data to include usernames column
    const transformedData = useMemo(() => {
        return initialData.map((ticket: any) => ({
            ...ticket,
            usernames: getUsernamesForTicket(ticket.stud_id)
        }));
    }, [initialData, users]);

    // Extended columns with usernames
    const extendedColumns = [...columns];
    extendedColumns.splice(5, 0, { key: "usernames" as any, label: "Assigned To (Users)", sortable: false });

    const handleDeleteClick = (item: any) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setFormData(item);
        setIsEditOpen(true);
    };

    const handleCreateNewTicket = () => {
        setSelectedItem(null);
        setFormData({ active: true, stud_id: [] });
        setInitialStudentsInput('');
        setTransactionIdsInput('');
        setIsEditOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedItem) {
            try {
                // If ticket has assigned users, remove ticket from their records
                if (selectedItem.stud_id && selectedItem.stud_id.length > 0) {
                    // Find users in the current users list that are assigned to this ticket
                    const assignedUsers = users.filter(user => 
                        selectedItem.stud_id?.includes(user.$id)
                    );
                    
                    // Update each user to remove this ticket ID from their tickets array
                    for (const user of assignedUsers) {
                        if (user.tickets && Array.isArray(user.tickets)) {
                            const updatedTickets = user.tickets.filter(
                                (ticketId: string) => ticketId !== selectedItem.$id
                            );
                            
                            // Update user's tickets array
                            await updateItem('users', user.$id, {
                                tickets: updatedTickets
                            });
                        }
                    }
                }
                
                // Now delete the ticket
                await deleteItem('tickets', selectedItem.$id);
                
                setMessage({ type: 'success', text: 'Ticket deleted successfully' });
                setIsDeleteOpen(false);
                setSelectedItem(null);
                
                // Refresh page after a short delay
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Error deleting ticket:', error);
                setMessage({ type: 'error', text: 'Failed to delete ticket' });
            }
        }
    };

    const handleIssueTicket = async () => {
        if (!selectedItem || !studentIdToIssue.trim()) {
            setMessage({ type: 'error', text: 'Please select a ticket and enter a student ID' });
            return;
        }

        const result = await issueTicket(selectedItem.$id, studentIdToIssue);
        setMessage({ type: result.success ? 'success' : 'error', text: result.message || result.error || 'An error occurred' });
        
        if (result.success) {
            setStudentIdToIssue('');
            setPaymentId('');
            setOrderId('');
            setIsIssueOpen(false);
            setSelectedItem(null);
            // Refresh page data
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    const handleCancelTicket = async () => {
        if (!selectedItem || !studentIdToCancel.trim()) {
            setMessage({ type: 'error', text: 'Please select a ticket and enter a student ID' });
            return;
        }

        const result = await cancelTicket(selectedItem.$id, studentIdToCancel);
        setMessage({ type: result.success ? 'success' : 'error', text: result.message || result.error || 'An error occurred' });
        
        if (result.success) {
            setStudentIdToCancel('');
            setIsCancelOpen(false);
            setSelectedItem(null);
            // Refresh page data
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.event_id) {
            alert('Please select an event');
            return;
        }

        // Process initial students for new tickets
        let studentIds: string[] = [];
        let transactionIds: string[] = [];
        
        if (!selectedItem && initialStudentsInput.trim()) {
            studentIds = initialStudentsInput
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0);
                
            // Process transaction IDs if provided
            if (transactionIdsInput.trim()) {
                transactionIds = transactionIdsInput
                    .split(',')
                    .map(id => id.trim())
                    .filter(id => id.length > 0);
            }
        }

        try {
            if (selectedItem && selectedItem.$id) {
                // Update existing ticket
                const dataToSave: any = {
                    ...formData,
                    active: formData.active ?? true,
                    stud_id: Array.isArray(formData.stud_id) ? formData.stud_id : []
                };
                await updateItem('tickets', selectedItem.$id, dataToSave);
                setMessage({ type: 'success', text: 'Ticket updated successfully' });
            } else {
                // Create new ticket with transactions
                const result = await createTicketWithTransactions(formData, studentIds, transactionIds);
                if (result.success) {
                    setMessage({ type: 'success', text: result.message || 'Ticket created successfully' });
                    
                    // Prepare ticket data for download
                    const selectedEvent = events.find(e => e.$id === formData.event_id);
                    if (result.ticketId && selectedEvent) {
                        setNewTicketData({
                            ticketId: result.ticketId,
                            eventName: selectedEvent.event_name,
                            eventId: selectedEvent.$id,
                            teamName: formData.team_name
                        });
                        setIsDownloadOpen(true);
                    }
                } else {
                    setMessage({ type: 'error', text: result.error || 'Failed to create ticket' });
                    return;
                }
            }
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({});
            setInitialStudentsInput('');
            setTransactionIdsInput('');
            
            // Only reload after a delay for updates, not for new creates with download
            if (selectedItem) {
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save ticket' });
        }
    };

    const handleOverview = () => {
        const totalTickets = initialData.length;
        const activeTickets = initialData.filter(t => t.active).length;
        const inactiveTickets = totalTickets - activeTickets;
        
        // Calculate total tickets issued (sum of all stud_id arrays)
        const totalIssued = initialData.reduce((sum, t) => sum + (t.stud_id?.length || 0), 0);

        // Distribution for Pie Chart
        const chartData = [
            { label: 'Active', value: activeTickets, color: '#22c55e' }, // green-500
            { label: 'Inactive', value: inactiveTickets, color: '#ef4444' } // red-500
        ];

        const report = `
            Ticket Issuance Report
            
            Summary:
            - Total Issued: ${totalIssued} student assignments
            - Ticket Records: ${totalTickets} unique ticket types
            - Active Records: ${activeTickets}
            - Inactive Records: ${inactiveTickets}
            
            Explanation:
            "Total Issued" = sum of all students assigned across all ticket records.
            "Ticket Records" = number of unique ticket entries.
            A mismatch means some tickets are assigned to multiple students.
            Average students per ticket: ${(totalIssued / totalTickets || 0).toFixed(1)}
            
            Metrics:
            - ${((activeTickets / totalTickets || 0) * 100).toFixed(1)}% of ticket records are active
            - Total associated events (unique): ${new Set(initialData.map(t => t.event_id)).size}
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Issued', value: totalIssued },
                { label: 'Total Records', value: totalTickets },
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
            try {
                // For each ticket to delete
                for (const item of items) {
                    // If ticket has assigned users, remove ticket from their records
                    if (item.stud_id && item.stud_id.length > 0) {
                        const assignedUsers = users.filter(user => 
                            item.stud_id?.includes(user.$id)
                        );
                        
                        // Update each user to remove this ticket ID
                        for (const user of assignedUsers) {
                            if (user.tickets && Array.isArray(user.tickets)) {
                                const updatedTickets = user.tickets.filter(
                                    (ticketId: string) => ticketId !== item.$id
                                );
                                
                                await updateItem('users', user.$id, {
                                    tickets: updatedTickets
                                });
                            }
                        }
                    }
                }
                
                // Now delete all tickets
                await Promise.all(items.map(item => deleteItem('tickets', item.$id)));
                
                setMessage({ type: 'success', text: `${items.length} tickets deleted successfully` });
                
                // Refresh page after a short delay
                setTimeout(() => window.location.reload(), 1000);
            } catch (error) {
                console.error('Error deleting tickets:', error);
                setMessage({ type: 'error', text: 'Failed to delete some tickets' });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Issued"
                    value={initialData.reduce((sum, t) => sum + (t.stud_id?.length || 0), 0)}
                    icon={Ticket}
                    color="text-purple-500"
                    subValue="Student assignments"
                />
                <StatsCard
                    title="Ticket Types"
                    value={initialData.length}
                    icon={Ticket}
                    color="text-purple-400"
                    subValue="Ticket records"
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

            {/* Quick Actions Toolbar */}
            {selectedItem && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between">
                    <div className="text-sm text-blue-300">
                        Selected: <span className="font-semibold">{selectedItem.team_name || selectedItem.$id}</span>
                        ({selectedItem.stud_id?.length || 0} students assigned)
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => {
                                setIsIssueOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Issue Ticket
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setIsCancelOpen(true);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Ticket
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedItem(null)}
                            className="text-gray-400 hover:text-gray-300"
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Add New Ticket Button */}
            <div className="flex justify-end mb-4">
                <Button
                    onClick={handleCreateNewTicket}
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add New Ticket
                </Button>
            </div>

            <DataTable
                data={transformedData}
                columns={extendedColumns}
                searchKeys={["event_name", "event_id", "$id", "usernames"]}
                onEdit={(item) => {
                    setSelectedItem(item);
                    handleEditClick(item);
                }}
                onDelete={handleDeleteClick}
                onDeleteMany={handleDeleteMany}
                placeholder="Search by event, ID, or username..."
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

            {/* Message Display */}
            {message && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {message.text}
                </div>
            )}

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

            {/* Issue Ticket Modal */}
            <Modal
                isOpen={isIssueOpen}
                onClose={() => {
                    setIsIssueOpen(false);
                    setStudentIdToIssue('');
                    setPaymentId('');
                    setOrderId('');
                    setSelectedItem(null);
                }}
                title="Issue Ticket"
                description={selectedItem ? `Issue ticket to a student (Ticket: ${selectedItem.team_name || selectedItem.$id})` : ''}
            >
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Student ID</label>
                        <Input
                            value={studentIdToIssue}
                            onChange={(e) => setStudentIdToIssue(e.target.value)}
                            placeholder="Enter student ID"
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 uppercase tracking-wider">Payment ID (Transition Link)</label>
                            <Input
                                value={paymentId}
                                onChange={(e) => setPaymentId(e.target.value)}
                                placeholder="Enter payment ID"
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 uppercase tracking-wider">Order ID</label>
                            <Input
                                value={orderId}
                                onChange={(e) => setOrderId(e.target.value)}
                                placeholder="Enter order ID"
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-sm text-blue-300">
                        Currently assigned: {selectedItem?.stud_id?.length || 0} students
                    </div>
                    
                    <p className="text-xs text-gray-500 italic">* Backend logic will duplicate the Payment ID into the required transition_id field.</p>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsIssueOpen(false);
                                setStudentIdToIssue('');
                                setPaymentId('');
                                setOrderId('');
                                setSelectedItem(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleIssueTicket}
                            className="bg-green-600 hover:bg-green-500 text-white"
                        >
                            <Send className="h-4 w-4 mr-2" />
                            Issue
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Cancel Ticket Modal */}
            <Modal
                isOpen={isCancelOpen}
                onClose={() => {
                    setIsCancelOpen(false);
                    setStudentIdToCancel('');
                    setSelectedItem(null);
                }}
                title="Cancel Ticket"
                description={selectedItem ? `Cancel ticket for a student (Ticket: ${selectedItem.team_name || selectedItem.$id})` : ''}
            >
                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Student ID</label>
                        <Input
                            value={studentIdToCancel}
                            onChange={(e) => setStudentIdToCancel(e.target.value)}
                            placeholder="Enter student ID"
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded text-sm text-orange-300">
                        {selectedItem?.stud_id && selectedItem.stud_id.length > 0 ? (
                            <>Assigned students: {selectedItem.stud_id.join(', ')}</>
                        ) : (
                            <>No students currently assigned</>
                        )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsCancelOpen(false);
                                setStudentIdToCancel('');
                                setSelectedItem(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCancelTicket}
                            className="bg-red-600 hover:bg-red-500 text-white"
                        >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setInitialStudentsInput('');
                    setTransactionIdsInput('');
                }}
                title={selectedItem ? "Edit Ticket" : "Create New Ticket"}
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                    {/* Event Selection (required for new tickets) */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Event *</label>
                        <select
                            value={formData.event_id || ''}
                            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-gray-300 hover:border-white/20 focus:border-cyan-500"
                            required
                        >
                            <option value="">Select an event</option>
                            {events.map((event: any) => (
                                <option key={event.$id} value={event.$id}>
                                    {event.event_name} ({event.fest})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Team Name */}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Team Name</label>
                        <Input
                            value={formData.team_name || ''}
                            onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                            placeholder="Enter team name (optional)"
                            className="bg-white/5 border-white/10"
                        />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="active-checkbox"
                            checked={formData.active !== false}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="h-4 w-4 bg-white/5 border-white/10 rounded"
                        />
                        <label htmlFor="active-checkbox" className="text-sm text-gray-400">Active</label>
                    </div>

                    {/* Initial Students (for new tickets) */}
                    {!selectedItem && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Initial Students (optional)</label>
                                <p className="text-xs text-gray-500">User IDs from the Users list (copy from Users table)</p>
                                <Input
                                    value={initialStudentsInput}
                                    onChange={(e) => setInitialStudentsInput(e.target.value)}
                                    placeholder="Enter user IDs separated by commas"
                                    className="bg-white/5 border-white/10"
                                />
                                <p className="text-xs text-gray-500">Format: userid1, userid2, userid3</p>
                                {initialStudentsInput.trim() && (
                                    <div className="bg-green-500/10 border border-green-500/30 p-2 rounded text-xs text-green-300">
                                        Will assign to {initialStudentsInput.split(',').filter(id => id.trim().length > 0).length} user(s)
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {selectedItem && (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-sm text-blue-300">
                            Students assigned: {selectedItem.stud_id?.length || 0}
                            <br />
                            <span className="text-xs text-blue-400">Use "Issue Ticket" or "Cancel Ticket" buttons to manage students</span>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">
                            {selectedItem ? 'Update' : 'Create'} Ticket
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Download Ticket Modal */}
            <Modal
                isOpen={isDownloadOpen}
                onClose={() => {
                    setIsDownloadOpen(false);
                    setNewTicketData(null);
                    setTimeout(() => window.location.reload(), 500);
                }}
                title="Ticket Created Successfully!"
                description="Download your new ticket with QR code"
            >
                <div className="space-y-4 mt-4">
                    {newTicketData && (
                        <>
                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded text-sm text-green-300">
                                <div className="font-semibold mb-2">Ticket Details</div>
                                <div className="space-y-1 text-xs">
                                    <div><span className="text-green-400">Ticket ID:</span> {newTicketData.ticketId}</div>
                                    <div><span className="text-green-400">Event:</span> {newTicketData.eventName}</div>
                                    {newTicketData.teamName && <div><span className="text-green-400">Team:</span> {newTicketData.teamName}</div>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-400">Choose download format:</p>
                                <div className="flex flex-col space-y-2">
                                    <Button
                                        onClick={() => {
                                            downloadTicketAsPDF(newTicketData);
                                            setIsDownloadOpen(false);
                                            setNewTicketData(null);
                                            setTimeout(() => window.location.reload(), 1000);
                                        }}
                                        className="w-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download as PDF (Printable)
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            downloadTicketAsHTML(newTicketData);
                                            setIsDownloadOpen(false);
                                            setNewTicketData(null);
                                            setTimeout(() => window.location.reload(), 1000);
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download as HTML (Interactive)
                                    </Button>
                                    
                                    <Button
                                        onClick={() => {
                                            downloadTicketAsImage(newTicketData);
                                            setIsDownloadOpen(false);
                                            setNewTicketData(null);
                                            setTimeout(() => window.location.reload(), 1000);
                                        }}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download as Image (PNG)
                                    </Button>
                                    
                                    <Button
                                        onClick={() => {
                                            downloadTicketAsCSV(newTicketData);
                                            setIsDownloadOpen(false);
                                            setNewTicketData(null);
                                            setTimeout(() => window.location.reload(), 1000);
                                        }}
                                        className="w-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download as CSV (Data)
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-xs text-blue-300">
                                💡 Tip: Use PDF for printing/saving. HTML for email. PNG for sharing. CSV for data records.
                            </div>
                        </>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsDownloadOpen(false);
                                setNewTicketData(null);
                                setTimeout(() => window.location.reload(), 500);
                            }}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
