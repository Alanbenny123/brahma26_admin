'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Users, Calendar, Ticket, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type DataSource = 'appwrite' | 'firebase' | 'error' | '';

export default function DataExamplePage() {
    const [users, setUsers] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [userSource, setUserSource] = useState<DataSource>('');
    const [eventSource, setEventSource] = useState<DataSource>('');
    const [ticketSource, setTicketSource] = useState<DataSource>('');
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [totalCounts, setTotalCounts] = useState<{ users: number; events: number; tickets: number }>({ users: 0, events: 0, tickets: 0 });

    const loadUsers = async (fetchAll: boolean = false) => {
        setLoading(prev => ({ ...prev, users: true }));
        try {
            const { fetchUsers } = await import('@/actions/data-fetcher');
            const result = await fetchUsers(fetchAll);
            if (result.success) {
                setUsers(fetchAll ? result.users : result.users.slice(0, 5)); // Show all or first 5
                setUserSource(result.source);
                setTotalCounts(prev => ({ ...prev, users: result.total }));
            } else {
                setUserSource('error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            setUserSource('error');
        } finally {
            setLoading(prev => ({ ...prev, users: false }));
        }
    };

    const loadEvents = async (fetchAll: boolean = false) => {
        setLoading(prev => ({ ...prev, events: true }));
        try {
            const { fetchEvents } = await import('@/actions/data-fetcher');
            const result = await fetchEvents(fetchAll);
            if (result.success) {
                setEvents(fetchAll ? result.events : result.events.slice(0, 5));
                setEventSource(result.source);
                setTotalCounts(prev => ({ ...prev, events: result.total }));
            } else {
                setEventSource('error');
            }
        } catch (error) {
            console.error('Error loading events:', error);
            setEventSource('error');
        } finally {
            setLoading(prev => ({ ...prev, events: false }));
        }
    };

    const loadTickets = async (fetchAll: boolean = false) => {
        setLoading(prev => ({ ...prev, tickets: true }));
        try {
            const { fetchTickets } = await import('@/actions/data-fetcher');
            const result = await fetchTickets(fetchAll);
            if (result.success) {
                setTickets(fetchAll ? result.tickets : result.tickets.slice(0, 5));
                setTicketSource(result.source);
                setTotalCounts(prev => ({ ...prev, tickets: result.total }));
            } else {
                setTicketSource('error');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            setTicketSource('error');
        } finally {
            setLoading(prev => ({ ...prev, tickets: false }));
        }
    };

    useEffect(() => {
        loadUsers();
        loadEvents();
        loadTickets();
    }, []);

    const getSourceBadge = (source: DataSource) => {
        switch (source) {
            case 'appwrite':
                return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🟢 Appwrite (Primary)</Badge>;
            case 'firebase':
                return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">🟡 Firebase (Fallback)</Badge>;
            case 'error':
                return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🔴 Error</Badge>;
            default:
                return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">⚪ Loading...</Badge>;
        }
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-white/90">Smart Data Fetching</h1>
                <p className="text-white/60 mt-2">
                    Automatic fallback from Appwrite to Firebase
                </p>
            </div>

            {/* Source Status Overview */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl text-white/90">Data Sources Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-white/70">Users</span>
                        {getSourceBadge(userSource)}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/70">Events</span>
                        {getSourceBadge(eventSource)}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-white/70">Tickets</span>
                        {getSourceBadge(ticketSource)}
                    </div>
                </CardContent>
            </Card>

            {/* Users Data */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-white/70" />
                            <CardTitle className="text-xl text-white/90">
                                Users {totalCounts.users > 0 && `(${users.length} of ${totalCounts.users})`}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {getSourceBadge(userSource)}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadUsers(false)}
                                disabled={loading.users}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading.users ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => loadUsers(true)}
                                disabled={loading.users}
                            >
                                Fetch All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.users ? (
                        <p className="text-white/60">Loading...</p>
                    ) : users.length > 0 ? (
                        <div className="space-y-3">
                            {users.map((user) => (
                                <div key={user.id} className="bg-white/5 rounded-lg p-4">
                                    <p className="text-white/90 font-medium">{user.name || 'N/A'}</p>
                                    <p className="text-white/60 text-sm">{user.email || 'N/A'}</p>
                                    {user.certificates && user.certificates.length > 0 && (
                                        <p className="text-white/50 text-xs mt-1">
                                            📜 {user.certificates.length} certificate(s)
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/60">No users found</p>
                    )}
                </CardContent>
            </Card>

            {/* Events Data */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-white/70" />
                            <CardTitle className="text-xl text-white/90">
                                Events {totalCounts.events > 0 && `(${events.length} of ${totalCounts.events})`}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {getSourceBadge(eventSource)}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadEvents(false)}
                                disabled={loading.events}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading.events ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => loadEvents(true)}
                                disabled={loading.events}
                            >
                                Fetch All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.events ? (
                        <p className="text-white/60">Loading...</p>
                    ) : events.length > 0 ? (
                        <div className="space-y-3">
                            {events.map((event) => (
                                <div key={event.id} className="bg-white/5 rounded-lg p-4">
                                    <p className="text-white/90 font-medium">{event.name || 'N/A'}</p>
                                    <p className="text-white/60 text-sm">{event.description || 'N/A'}</p>
                                    {event.imageUrl && (
                                        <p className="text-white/50 text-xs mt-1">
                                            🖼️ Has image
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/60">No events found</p>
                    )}
                </CardContent>
            </Card>

            {/* Tickets Data */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-white/70" />
                            <CardTitle className="text-xl text-white/90">
                                Tickets {totalCounts.tickets > 0 && `(${tickets.length} of ${totalCounts.tickets})`}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {getSourceBadge(ticketSource)}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => loadTickets(false)}
                                disabled={loading.tickets}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading.tickets ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => loadTickets(true)}
                                disabled={loading.tickets}
                            >
                                Fetch All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading.tickets ? (
                        <p className="text-white/60">Loading...</p>
                    ) : tickets.length > 0 ? (
                        <div className="space-y-3">
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="bg-white/5 rounded-lg p-4">
                                    <p className="text-white/90 font-medium">Ticket #{ticket.id?.slice(0, 8)}</p>
                                    <p className="text-white/60 text-sm">Status: {ticket.status || 'N/A'}</p>
                                    {ticket.qrCodeUrl && (
                                        <p className="text-white/50 text-xs mt-1">
                                            🔲 Has QR code
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/60">No tickets found</p>
                    )}
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl text-white/90">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-white/70">
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">🔄 Smart Fallback Logic</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li>Check if Appwrite is available</li>
                            <li>If yes → Fetch from Appwrite (primary source)</li>
                            <li>If no → Fetch from Firebase (backup source)</li>
                            <li>Return data + source information</li>
                        </ol>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">🗂️ Fetch All Data</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>Default mode:</strong> Fetches up to 1000 documents (fast)</li>
                            <li><strong>Fetch All mode:</strong> Retrieves ALL documents via pagination (complete)</li>
                            <li>Use "Fetch All" button to get complete dataset</li>
                            <li>Pagination automatically handles large datasets</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">📦 Data Types</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li><strong>Non-image data:</strong> Stored in Appwrite, synced to Firebase</li>
                            <li><strong>Image data:</strong> Stored in Firebase Storage (URLs in DB)</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">✅ Benefits</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>High availability - no downtime</li>
                            <li>Fast image delivery via Firebase CDN</li>
                            <li>Automatic fallback on errors</li>
                            <li>Source transparency for monitoring</li>
                            <li>Complete data access with fetch all option</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

