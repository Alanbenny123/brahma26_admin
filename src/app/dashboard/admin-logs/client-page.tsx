'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Activity, Eye, Edit, Trash2, LogIn, LogOut, RefreshCw, FileText, Shield } from "lucide-react";
import { AdminLog } from "@/actions/admin-logs";
import { Badge } from "@/components/ui/badge";
import { useActivityLogger } from "@/lib/use-activity-logger";

interface ClientAdminLogsPageProps {
    initialLogs: AdminLog[];
    initialTotal: number;
    stats: {
        totalLogs: number;
        actionTypeCounts: Record<string, number>;
        adminActivityCounts: Record<string, number>;
        uniqueAdmins: number;
        recentActivity24h: number;
        mostActiveAdmin: string;
    } | null;
}

interface LogWithFormatting extends AdminLog {
    formattedTimestamp: string;
    actionTypeLabel: string;
}

export default function ClientAdminLogsPage({ initialLogs, initialTotal, stats }: ClientAdminLogsPageProps) {
    // Log page view activity
    useActivityLogger();
    
    const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterAdmin, setFilterAdmin] = useState<string>('all');

    // Get unique admins for filter dropdown
    const uniqueAdmins = Array.from(new Set(initialLogs.map(log => log.adminEmail))).sort();

    // Format logs for display
    const logsWithFormatting: LogWithFormatting[] = initialLogs.map(log => ({
        ...log,
        formattedTimestamp: new Date(log.timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }),
        actionTypeLabel: getActionTypeLabel(log.actionType),
    }));

    // Filter logs by action type and admin
    const filteredLogs = logsWithFormatting.filter(log => {
        const typeMatch = filterType === 'all' || log.actionType === filterType;
        const adminMatch = filterAdmin === 'all' || log.adminEmail === filterAdmin;
        return typeMatch && adminMatch;
    });

    const handleViewDetails = (log: LogWithFormatting) => {
        setSelectedLog(log);
        setIsDetailsOpen(true);
    };

    const columns: { key: keyof LogWithFormatting; label: string; sortable?: boolean }[] = [
        { key: "formattedTimestamp", label: "Timestamp", sortable: true },
        { key: "adminEmail", label: "Admin", sortable: true },
        { key: "actionTypeLabel", label: "Type", sortable: true },
        { key: "action", label: "Action", sortable: true },
        { key: "resource", label: "Resource" },
    ];

    // Get action type icon and color
    function getActionTypeIcon(actionType: string) {
        switch (actionType) {
            case 'view': return <Eye className="w-4 h-4" />;
            case 'create': return <FileText className="w-4 h-4" />;
            case 'update': return <Edit className="w-4 h-4" />;
            case 'delete': return <Trash2 className="w-4 h-4" />;
            case 'login': return <LogIn className="w-4 h-4" />;
            case 'logout': return <LogOut className="w-4 h-4" />;
            case 'sync': return <RefreshCw className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    }

    function getActionTypeColor(actionType: string) {
        switch (actionType) {
            case 'view': return 'text-blue-500';
            case 'create': return 'text-green-500';
            case 'update': return 'text-yellow-500';
            case 'delete': return 'text-red-500';
            case 'login': return 'text-cyan-500';
            case 'logout': return 'text-gray-500';
            case 'sync': return 'text-purple-500';
            default: return 'text-gray-400';
        }
    }

    function getActionTypeLabel(actionType: string) {
        return actionType.charAt(0).toUpperCase() + actionType.slice(1);
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Activity Logs</h1>
                    <p className="text-gray-400 mt-1">Track and monitor all admin actions</p>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Logs"
                        value={stats.totalLogs}
                        icon={Activity}
                        color="text-blue-500"
                    />
                    <StatsCard
                        title="Active Admins"
                        value={stats.uniqueAdmins}
                        icon={Shield}
                        color="text-green-500"
                    />
                    <StatsCard
                        title="Recent Activity (24h)"
                        value={stats.recentActivity24h}
                        icon={Activity}
                        color="text-purple-500"
                    />
                    <StatsCard
                        title="Most Active"
                        value={stats.mostActiveAdmin}
                        icon={Shield}
                        color="text-cyan-500"
                        className="text-sm"
                    />
                </div>
            )}

            {/* Action Type Filter */}
            <div className="space-y-3">
                {/* Admin Filter */}
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <label className="text-sm text-gray-400 mb-2 block">Filter by Admin</label>
                    <select
                        value={filterAdmin}
                        onChange={(e) => setFilterAdmin(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                    >
                        <option value="all">All Admins ({logsWithFormatting.length} logs)</option>
                        {uniqueAdmins.map(admin => {
                            const count = logsWithFormatting.filter(log => log.adminEmail === admin).length;
                            return (
                                <option key={admin} value={admin}>
                                    {admin} ({count} logs)
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Action Type Filter */}
                <div className="flex flex-wrap gap-2 bg-gray-800/50 p-4 rounded-lg">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            filterType === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        All Actions ({filteredLogs.length})
                    </button>
                    {['create', 'update', 'delete', 'login', 'logout', 'sync'].map(type => {
                        const count = filteredLogs.filter(log => log.actionType === type).length;
                        return (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                                    filterType === type
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                <span className={getActionTypeColor(type)}>
                                    {getActionTypeIcon(type)}
                                </span>
                                {getActionTypeLabel(type)} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Action Type Statistics */}
            {stats && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Activity Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(stats.actionTypeCounts).map(([type, count]) => (
                            <div key={type} className="flex items-center gap-2">
                                <span className={getActionTypeColor(type)}>
                                    {getActionTypeIcon(type)}
                                </span>
                                <div>
                                    <p className="text-sm text-gray-400">{getActionTypeLabel(type)}</p>
                                    <p className="text-lg font-semibold text-white">{count}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Admin Activity Statistics */}
            {stats && stats.adminActivityCounts && Object.keys(stats.adminActivityCounts).length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Admin Activity</h3>
                    <div className="space-y-2">
                        {Object.entries(stats.adminActivityCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                            .map(([admin, count]) => (
                                <div key={admin} className="flex items-center justify-between">
                                    <span className="text-gray-300">{admin}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32 bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{
                                                    width: `${(count / Math.max(...Object.values(stats.adminActivityCounts))) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <span className="text-white font-semibold w-12 text-right">{count}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={filteredLogs}
                columns={columns}
                onEdit={handleViewDetails}
                editLabel="View Details"
                showDelete={false}
                searchKeys={['adminEmail', 'action', 'resource']}
                placeholder="Search by admin, action, or resource..."
            />

            {/* Log Details Modal */}
            <Modal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedLog(null);
                }}
                title="Activity Log Details"
            >
                {selectedLog && (
                    <div className="space-y-4">
                        {/* Header with action type badge */}
                        <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
                            <div className={`p-3 rounded-lg bg-gray-800 ${getActionTypeColor(selectedLog.actionType)}`}>
                                {getActionTypeIcon(selectedLog.actionType)}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">{selectedLog.action}</h3>
                                <Badge variant="secondary" className="mt-1">
                                    {getActionTypeLabel(selectedLog.actionType)}
                                </Badge>
                            </div>
                        </div>

                        {/* Main Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <span className="text-gray-400 text-sm">Admin Email</span>
                                <p className="font-medium text-white mt-1">{selectedLog.adminEmail}</p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <span className="text-gray-400 text-sm">Timestamp</span>
                                <p className="font-medium text-white mt-1">
                                    {new Date(selectedLog.timestamp).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true
                                    })}
                                </p>
                            </div>
                            <div className="bg-gray-800/50 rounded-lg p-3">
                                <span className="text-gray-400 text-sm">Action Type</span>
                                <p className="font-medium text-white mt-1 flex items-center gap-2">
                                    <span className={getActionTypeColor(selectedLog.actionType)}>
                                        {getActionTypeIcon(selectedLog.actionType)}
                                    </span>
                                    {getActionTypeLabel(selectedLog.actionType)}
                                </p>
                            </div>
                        </div>

                        {/* Resource Information */}
                        {(selectedLog.resource || selectedLog.resourceid) && (
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <h4 className="font-semibold text-white mb-3">Resource Information</h4>
                                <div className="space-y-2">
                                    {selectedLog.resource && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Resource Type:</span>
                                            <p className="font-medium text-white">{selectedLog.resource}</p>
                                        </div>
                                    )}
                                    {selectedLog.resourceid && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Resource ID:</span>
                                            <p className="font-medium text-white font-mono text-sm">{selectedLog.resourceid}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Technical Information */}
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <h4 className="font-semibold text-white mb-3">Technical Information</h4>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-400 text-sm">IP Address:</span>
                                    <p className="font-medium text-white font-mono text-sm">{selectedLog.ipAddress || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm">User Agent:</span>
                                    <p className="font-medium text-white text-sm break-all">{selectedLog.userAgent || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-sm">Log ID:</span>
                                    <p className="font-medium text-white font-mono text-sm">{selectedLog.$id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
