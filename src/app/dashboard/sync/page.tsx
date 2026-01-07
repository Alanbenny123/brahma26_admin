'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Database, CheckCircle, XCircle, Zap } from 'lucide-react';

export default function SyncPage() {
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState<any>(null);

    const handleSyncAll = async () => {
        setSyncing(true);
        setResults(null);
        
        try {
            const { syncAllToFirebase } = await import('@/actions/sync');
            const result = await syncAllToFirebase();
            setResults(result);
        } catch (error) {
            console.error('Sync error:', error);
            setResults({ success: false, error: 'Sync failed' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncUsers = async () => {
        setSyncing(true);
        try {
            const { syncUsersToFirestore } = await import('@/actions/sync');
            const result = await syncUsersToFirestore();
            setResults({ success: true, results: { users: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync users' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncEvents = async () => {
        setSyncing(true);
        try {
            const { syncEventsToFirestore } = await import('@/actions/sync');
            const result = await syncEventsToFirestore();
            setResults({ success: true, results: { events: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync events' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncTickets = async () => {
        setSyncing(true);
        try {
            const { syncTicketsToFirestore } = await import('@/actions/sync');
            const result = await syncTicketsToFirestore();
            setResults({ success: true, results: { tickets: result } });
        } catch (error) {
            setResults({ success: false, error: 'Failed to sync tickets' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncTransactions = async () => {
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

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    Database Sync
                </h1>
                <Database className="w-12 h-12 text-cyan-400" />
            </div>

            {/* Real-time Status */}
            <Card className="glass-card border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-green-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-green-400">Real-time Sync Active</h3>
                            <p className="text-white/60 text-sm">
                                Changes in Appwrite are automatically synced to Firebase in real-time
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Manual Sync Controls */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl text-white/90">Manual Sync (One-time)</CardTitle>
                    <p className="text-white/60 text-sm">Use these to sync existing data from Appwrite to Firebase</p>
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
                                            Synced: {results.results.users.synced} | 
                                            Skipped: {results.results.users.skipped} | 
                                            Failed: {results.results.users.failed} | 
                                            Total: {results.results.users.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.events && (
                                    <div className="p-4 bg-amber-500/10 rounded-lg">
                                        <h3 className="font-semibold text-amber-400 mb-2">Events</h3>
                                        <p className="text-white/70">
                                            Synced: {results.results.events.synced} | 
                                            Failed: {results.results.events.failed} | 
                                            Total: {results.results.events.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.tickets && (
                                    <div className="p-4 bg-purple-500/10 rounded-lg">
                                        <h3 className="font-semibold text-purple-400 mb-2">Tickets</h3>
                                        <p className="text-white/70">
                                            Synced: {results.results.tickets.synced} | 
                                            Failed: {results.results.tickets.failed} | 
                                            Total: {results.results.tickets.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.transactions && (
                                    <div className="p-4 bg-pink-500/10 rounded-lg">
                                        <h3 className="font-semibold text-pink-400 mb-2">Transactions</h3>
                                        <p className="text-white/70">
                                            Synced: {results.results.transactions.synced} | 
                                            Failed: {results.results.transactions.failed} | 
                                            Total: {results.results.transactions.total}
                                        </p>
                                    </div>
                                )}
                                {results.results.attendance && (
                                    <div className="p-4 bg-green-500/10 rounded-lg">
                                        <h3 className="font-semibold text-green-400 mb-2">Attendance</h3>
                                        <p className="text-white/70">
                                            Synced: {results.results.attendance.synced} | 
                                            Failed: {results.results.attendance.failed} | 
                                            Total: {results.results.attendance.total}
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
                        <h4 className="text-green-400 font-semibold flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Real-time Sync (Automatic)
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-6">
                            <li>Listens to Appwrite database changes in real-time</li>
                            <li>Automatically syncs CREATE, UPDATE, DELETE operations</li>
                            <li>Works for Users, Events, Tickets, and Attendance</li>
                            <li>No manual intervention needed</li>
                        </ul>
                    </div>

                    <div className="space-y-2 pt-4">
                        <h4 className="text-cyan-400 font-semibold flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Manual Sync (One-time)
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-6">
                            <li>Use to sync existing data from Appwrite to Firebase</li>
                            <li>Prevents duplicates by checking Appwrite IDs</li>
                            <li>Useful for initial data migration</li>
                            <li>Can sync all at once or by collection type</li>
                            <li>Supports: Users, Events, Tickets, Transactions, Attendance</li>
                        </ul>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
                        <p className="text-amber-400 font-medium">💡 Recommended Workflow:</p>
                        <ol className="list-decimal list-inside space-y-1 mt-2 ml-2">
                            <li>Run manual sync once to migrate existing data</li>
                            <li>Real-time sync handles all new changes automatically</li>
                            <li>Check browser console for sync logs</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

