'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Database, CheckCircle, XCircle, Clock, Timer } from 'lucide-react';

export default function SyncPage() {
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [syncInterval, setSyncInterval] = useState(30); // minutes
    const [nextSyncTime, setNextSyncTime] = useState<string>('');
    const [lastSyncTime, setLastSyncTime] = useState<string>('');
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; collection: string } | null>(null);
    const [showProductionWarning, setShowProductionWarning] = useState(false);
    
    // Detect if in production (you can adjust this check)
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

    // Auto-sync timer
    useEffect(() => {
        if (!autoSyncEnabled) return;

        const intervalMs = syncInterval * 60 * 1000; // Convert minutes to milliseconds
        
        const timer = setInterval(() => {
            handleSyncAll();
        }, intervalMs);

        // Calculate next sync time
        const updateNextSyncTime = () => {
            const next = new Date(Date.now() + intervalMs);
            setNextSyncTime(next.toLocaleTimeString());
        };
        updateNextSyncTime();
        const timeUpdater = setInterval(updateNextSyncTime, 1000);

        return () => {
            clearInterval(timer);
            clearInterval(timeUpdater);
        };
    }, [autoSyncEnabled, syncInterval]);

    const handleSyncAll = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        
        setSyncing(true);
        setResults(null);
        setSyncProgress(null);
        
        try {
            const { syncAllToFirebase } = await import('@/actions/sync');
            const result = await syncAllToFirebase();
            setResults(result);
            setLastSyncTime(new Date().toLocaleString());
        } catch (error) {
            console.error('Sync error:', error);
            setResults({ success: false, error: 'Sync failed' });
        } finally {
            setSyncing(false);
            setSyncProgress(null);
        }
    };

    const toggleAutoSync = () => {
        setAutoSyncEnabled(!autoSyncEnabled);
        if (!autoSyncEnabled) {
            setLastSyncTime('');
            setNextSyncTime('');
        }
    };

    const handleSyncUsers = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        
        setSyncing(true);
        setSyncProgress(null);
        try {
            const { syncUsersToFirestore } = await import('@/actions/sync');
            const result = await syncUsersToFirestore(50, (current, total) => {
                setSyncProgress({ current, total, collection: 'Users' });
            });
            setResults({ success: true, results: { users: result } });
            setSyncProgress(null);
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync users' });
            setSyncProgress(null);
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncEvents = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        
        setSyncing(true);
        setSyncProgress(null);
        try {
            const { syncEventsToFirestore } = await import('@/actions/sync');
            const result = await syncEventsToFirestore(50, (current, total) => {
                setSyncProgress({ current, total, collection: 'Events' });
            });
            setResults({ success: true, results: { events: result } });
            setSyncProgress(null);
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync events' });
            setSyncProgress(null);
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncTickets = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        
        setSyncing(true);
        setSyncProgress(null);
        try {
            const { syncTicketsToFirestore } = await import('@/actions/sync');
            const result = await syncTicketsToFirestore(50, (current, total) => {
                setSyncProgress({ current, total, collection: 'Tickets' });
            });
            setResults({ success: true, results: { tickets: result } });
            setSyncProgress(null);
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync tickets' });
            setSyncProgress(null);
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncTransactions = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        setSyncing(true);
        try {
            const { syncTransactionsToFirestore } = await import('@/actions/sync');
            const result = await syncTransactionsToFirestore();
            setResults({ success: true, results: { transactions: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync transactions' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncAttendance = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        setSyncing(true);
        try {
            const { syncAttendanceToFirestore } = await import('@/actions/sync');
            const result = await syncAttendanceToFirestore();
            setResults({ success: true, results: { attendance: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync attendance' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncAdmins = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        setSyncing(true);
        try {
            const { syncAdminsToFirestore } = await import('@/actions/sync');
            const result = await syncAdminsToFirestore();
            setResults({ success: true, results: { admins: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync admins' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncIEE = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        setSyncing(true);
        try {
            const { syncIEEToFirestore } = await import('@/actions/sync');
            const result = await syncIEEToFirestore();
            setResults({ success: true, results: { iee: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync IEE' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncIEI = async () => {
        if (isProduction) {
            setShowProductionWarning(true);
            return;
        }
        setSyncing(true);
        try {
            const { syncIEIToFirestore } = await import('@/actions/sync');
            const result = await syncIEIToFirestore();
            setResults({ success: true, results: { iei: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync IEI' });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    Database Sync
                </h1>
                <Database className="w-12 h-12 text-cyan-400" />
            </div>

            {/* Auto-Sync Scheduler */}
            <Card className="glass-card border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-white/90">
                        <Timer className="w-5 h-5 text-blue-400" />
                        Scheduled Auto-Sync
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 font-medium">Enable Automatic Sync</p>
                            <p className="text-white/50 text-sm">Automatically sync all data at regular intervals</p>
                        </div>
                        <Button
                            onClick={toggleAutoSync}
                            variant={autoSyncEnabled ? "default" : "outline"}
                            className={autoSyncEnabled ? "bg-green-500 hover:bg-green-400" : ""}
                        >
                            {autoSyncEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                    </div>

                    {autoSyncEnabled && (
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-sm text-white/70 mb-2 block">Sync Interval (minutes)</label>
                                    <Input
                                        type="number"
                                        min="5"
                                        max="1440"
                                        value={syncInterval}
                                        onChange={(e) => setSyncInterval(Number(e.target.value))}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm text-white/70 mb-2 block">Common Intervals</label>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setSyncInterval(15)}>15m</Button>
                                        <Button size="sm" variant="outline" onClick={() => setSyncInterval(30)}>30m</Button>
                                        <Button size="sm" variant="outline" onClick={() => setSyncInterval(60)}>1h</Button>
                                        <Button size="sm" variant="outline" onClick={() => setSyncInterval(360)}>6h</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p className="text-xs text-white/50 mb-1">Last Sync</p>
                                    <p className="text-sm text-white/80 font-mono">
                                        {lastSyncTime || 'Not synced yet'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/50 mb-1">Next Sync</p>
                                    <p className="text-sm text-white/80 font-mono flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {nextSyncTime || 'Calculating...'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-amber-400 text-sm">
                                <span>⚠️</span>
                                <p>Auto-sync will run in this browser tab. Keep the tab open for continuous syncing.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Production Warning */}
            {isProduction && (
                <Card className="glass-card border-amber-500/50 bg-amber-500/10">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="text-amber-400 text-3xl">⚠️</div>
                            <div className="flex-1">
                                <h3 className="text-amber-400 font-bold text-lg mb-2">Production Environment Detected</h3>
                                <p className="text-amber-200 mb-3">
                                    Manual sync is disabled in production to prevent timeouts and performance issues.
                                </p>
                                <ul className="text-amber-200/80 text-sm space-y-1 list-disc list-inside">
                                    <li>Real-time sync is automatically handling all changes</li>
                                    <li>Each Appwrite change syncs to Firebase instantly</li>
                                    <li>For initial bulk sync, run locally with <code className="bg-amber-900/30 px-2 py-1 rounded">npm run dev</code></li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Progress Bar */}
            {syncProgress && (
                <Card className="glass-card border-cyan-500/50 bg-cyan-500/10">
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-cyan-400 font-medium">Syncing {syncProgress.collection}...</span>
                                <span className="text-cyan-300 text-sm">
                                    {syncProgress.current} / {syncProgress.total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-cyan-200 text-xs">
                                Processing in batches of 50 records...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Manual Sync Controls */}
            <Card className={`glass-card border-white/10 ${isProduction ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardHeader>
                    <CardTitle className="text-xl text-white/90">Manual Sync (One-time)</CardTitle>
                    <p className="text-white/60 text-sm">
                        {isProduction 
                            ? '⚠️ Disabled in production - Use local development for manual sync' 
                            : 'Use these to sync existing data from Appwrite to Firebase'}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={handleSyncAll}
                            disabled={syncing}
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync All Data
                        </Button>

                        <Button
                            onClick={handleSyncUsers}
                            disabled={syncing}
                            variant="outline"
                            className="border-cyan-500/50 hover:bg-cyan-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Users Only
                        </Button>

                        <Button
                            onClick={handleSyncEvents}
                            disabled={syncing}
                            variant="outline"
                            className="border-amber-500/50 hover:bg-amber-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Events Only
                        </Button>

                        <Button
                            onClick={handleSyncTickets}
                            disabled={syncing}
                            variant="outline"
                            className="border-purple-500/50 hover:bg-purple-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Tickets Only
                        </Button>

                        <Button
                            onClick={handleSyncTransactions}
                            disabled={syncing}
                            variant="outline"
                            className="border-pink-500/50 hover:bg-pink-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Transactions Only
                        </Button>

                        <Button
                            onClick={handleSyncAttendance}
                            disabled={syncing}
                            variant="outline"
                            className="border-green-500/50 hover:bg-green-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Attendance Only
                        </Button>

                        <Button
                            onClick={handleSyncAdmins}
                            disabled={syncing}
                            variant="outline"
                            className="border-red-500/50 hover:bg-red-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync Admins Only
                        </Button>

                        <Button
                            onClick={handleSyncIEE}
                            disabled={syncing}
                            variant="outline"
                            className="border-indigo-500/50 hover:bg-indigo-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync IEE Only
                        </Button>

                        <Button
                            onClick={handleSyncIEI}
                            disabled={syncing}
                            variant="outline"
                            className="border-violet-500/50 hover:bg-violet-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            Sync IEI Only
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {results && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {results.success ? (
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            ) : (
                                <XCircle className="w-6 h-6 text-red-400" />
                            )}
                            <span className="text-white/90">Sync Results</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {results.success && results.results ? (
                            <div className="space-y-4">
                                {results.results.users && (
                                    <div className="p-4 bg-cyan-500/10 rounded-lg">
                                        <h3 className="font-semibold text-cyan-400 mb-2">Users</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.users.synced} | 
                                            Updated: {results.results.users.updated} | 
                                            Failed: {results.results.users.failed} | 
                                            Total: {results.results.users.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.events && (
                                    <div className="p-4 bg-amber-500/10 rounded-lg">
                                        <h3 className="font-semibold text-amber-400 mb-2">Events</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.events.synced} | 
                                            Updated: {results.results.events.updated} | 
                                            Failed: {results.results.events.failed} | 
                                            Total: {results.results.events.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.tickets && (
                                    <div className="p-4 bg-purple-500/10 rounded-lg">
                                        <h3 className="font-semibold text-purple-400 mb-2">Tickets</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.tickets.synced} | 
                                            Updated: {results.results.tickets.updated} | 
                                            Failed: {results.results.tickets.failed} | 
                                            Total: {results.results.tickets.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.transactions && (
                                    <div className="p-4 bg-pink-500/10 rounded-lg">
                                        <h3 className="font-semibold text-pink-400 mb-2">Transactions</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.transactions.synced} | 
                                            Updated: {results.results.transactions.updated} | 
                                            Failed: {results.results.transactions.failed} | 
                                            Total: {results.results.transactions.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.attendance && (
                                    <div className="p-4 bg-green-500/10 rounded-lg">
                                        <h3 className="font-semibold text-green-400 mb-2">Attendance</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.attendance.synced} | 
                                            Updated: {results.results.attendance.updated} | 
                                            Failed: {results.results.attendance.failed} | 
                                            Total: {results.results.attendance.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.admins && (
                                    <div className="p-4 bg-red-500/10 rounded-lg">
                                        <h3 className="font-semibold text-red-400 mb-2">Admins</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.admins.synced} | 
                                            Updated: {results.results.admins.updated} | 
                                            Failed: {results.results.admins.failed} | 
                                            Total: {results.results.admins.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.iee && (
                                    <div className="p-4 bg-indigo-500/10 rounded-lg">
                                        <h3 className="font-semibold text-indigo-400 mb-2">IEE</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.iee.synced} | 
                                            Updated: {results.results.iee.updated} | 
                                            Failed: {results.results.iee.failed} | 
                                            Total: {results.results.iee.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.iei && (
                                    <div className="p-4 bg-violet-500/10 rounded-lg">
                                        <h3 className="font-semibold text-violet-400 mb-2">IEI</h3>
                                        <p className="text-white/70">
                                            Created: {results.results.iei.synced} | 
                                            Updated: {results.results.iei.updated} | 
                                            Failed: {results.results.iei.failed} | 
                                            Total: {results.results.iei.total}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-red-400">{results.error || 'Sync failed'}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* How It Works */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-white/90">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="text-white/70 space-y-3">
                    <div className="space-y-2">
                        <h4 className="text-cyan-400 font-semibold flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Manual Sync
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-6">
                            <li>Use to sync existing data from Appwrite to Firebase</li>
                            <li>Prevents duplicates by checking Appwrite IDs</li>
                            <li>Useful for data synchronization and backup</li>
                            <li>Can sync all at once or by collection type</li>
                            <li>Supports: Users, Events, Tickets, Transactions, Attendance, Admins, IEE, IEI</li>
                        </ul>
                    </div>

                    <div className="space-y-2 pt-4">
                        <h4 className="text-blue-400 font-semibold flex items-center gap-2">
                            <Timer className="w-4 h-4" />
                            Scheduled Auto-Sync
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-6">
                            <li>Enable automatic syncing at regular intervals</li>
                            <li>Runs in your browser tab (keep tab open)</li>
                            <li>Configurable interval from 5 minutes to 24 hours</li>
                            <li>Shows next sync time and last sync status</li>
                        </ul>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
                        <p className="text-amber-400 font-medium">💡 Recommended Workflow:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-2 ml-2">
                            <li>Run manual sync ONLY in development (localhost)</li>
                            <li>Production uses automatic real-time sync (no manual sync needed)</li>
                            <li>Batch processing syncs 50 records at a time to prevent timeouts</li>
                            <li>Monitor progress bar during sync operations</li>
                        </ol>
                    </div>
                    
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
                        <p className="text-green-400 font-medium">✅ Real-time Sync Status:</p>
                        <p className="text-green-200 text-sm mt-2">
                            Your application automatically syncs all Appwrite changes to Firebase in real-time. 
                            Manual sync is only needed for initial setup or data recovery.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

