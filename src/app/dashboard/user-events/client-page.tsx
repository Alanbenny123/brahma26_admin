'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Users as UsersIcon, CalendarCheck } from "lucide-react";
import { useActivityLogger } from "@/lib/use-activity-logger";

interface EventRegistration {
    ticketId: string;
    eventId: string;
    eventName: string;
    fest: string;
    date: string;
    time: string;
    teamName?: string;
    active: boolean;
}

interface UserWithEvents {
    $id: string;
    name: string;
    email: string;
    phone?: string;
    college?: string;
    registeredEvents: EventRegistration[];
    eventCount: number;
}

interface UserWithEventNames extends UserWithEvents {
    eventNames: string;
}

interface ClientUserEventsPageProps {
    initialData: UserWithEvents[];
    total: number;
}

export default function ClientUserEventsPage({ initialData, total }: ClientUserEventsPageProps) {
    // Log page view
    useActivityLogger();
    
    const [selectedUser, setSelectedUser] = useState<UserWithEvents | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'users' | 'events'>('users');
    const [selectedEvent, setSelectedEvent] = useState<{ 
        eventId: string; 
        eventName: string; 
        fest: string;
        date: string;
        time: string;
        active: boolean;
        users: Array<{ name: string; email: string; phone?: string; college?: string; teamName?: string }> 
    } | null>(null);
    const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

    // Ensure initialData is always an array
    const users = initialData || [];

    // Calculate total registrations per event across all users
    const eventRegistrationCounts = users.reduce((acc, user) => {
        user.registeredEvents?.forEach(event => {
            if (!acc[event.eventId]) {
                acc[event.eventId] = 0;
            }
            acc[event.eventId]++;
        });
        return acc;
    }, {} as Record<string, number>);

    // Group events with their registered users
    const eventsWithUsers = users.reduce((acc, user) => {
        user.registeredEvents?.forEach(event => {
            if (!acc[event.eventId]) {
                acc[event.eventId] = {
                    eventId: event.eventId,
                    eventName: event.eventName,
                    fest: event.fest,
                    date: event.date,
                    time: event.time,
                    active: event.active,
                    users: []
                };
            }
            acc[event.eventId].users.push({
                name: user.name,
                email: user.email,
                phone: user.phone,
                college: user.college,
                teamName: event.teamName
            });
        });
        return acc;
    }, {} as Record<string, { eventId: string; eventName: string; fest: string; date: string; time: string; active: boolean; users: Array<{ name: string; email: string; phone?: string; college?: string; teamName?: string }> }>);

    const eventsArray = Object.values(eventsWithUsers).map(event => ({
        $id: event.eventId, // Add $id for DataTable key prop
        ...event,
        registrationCount: event.users.length
    }));

    // Transform data to include event names as strings for table display
    const usersWithEventNames = users.map(user => {
        // Get unique events by eventId
        const uniqueEvents = user.registeredEvents?.reduce((acc, event) => {
            if (!acc.some(e => e.eventId === event.eventId)) {
                acc.push(event);
            }
            return acc;
        }, [] as EventRegistration[]) || [];
        
        return {
            ...user,
            eventNames: uniqueEvents.map(e => e.eventName).join(', ') || 'No events'
        };
    });

    // Calculate statistics
    const totalUsers = users.length;
    const usersWithEvents = users.filter(u => u.eventCount > 0).length;
    const totalRegistrations = users.reduce((sum, user) => sum + (user.eventCount || 0), 0);
    const avgEventsPerUser = totalUsers > 0 ? (totalRegistrations / totalUsers).toFixed(1) : 0;

    const handleViewDetails = (user: UserWithEventNames) => {
        setSelectedUser(user);
        setIsDetailsOpen(true);
    };

    const handleViewEventDetails = (event: typeof eventsArray[0]) => {
        setSelectedEvent(event);
        setIsEventDetailsOpen(true);
    };

    const columns: { key: keyof UserWithEventNames; label: string; sortable?: boolean; multiline?: boolean }[] = [
        { key: "name", label: "Name", sortable: true },
        { key: "email", label: "Email", sortable: true },
        { key: "phone", label: "Phone" },
        { key: "college", label: "College", sortable: true },
        { key: "eventNames", label: "Event Names", multiline: true },
    ];

    return (
        <div className="space-y-6">
            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setViewMode('users')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'users'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    View by Users
                </button>
                <button
                    onClick={() => setViewMode('events')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'events'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                    }`}
                >
                    View by Events
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Users"
                    value={totalUsers}
                    icon={UsersIcon}
                    color="text-blue-500"
                />
                <StatsCard
                    title="Users with Registrations"
                    value={usersWithEvents}
                    icon={UsersIcon}
                    color="text-green-500"
                    subValue={`${((usersWithEvents / totalUsers) * 100 || 0).toFixed(1)}% of total`}
                />
                <StatsCard
                    title="Total Registrations"
                    value={totalRegistrations}
                    icon={CalendarCheck}
                    color="text-purple-500"
                />
                <StatsCard
                    title="Avg Events/User"
                    value={avgEventsPerUser}
                    icon={CalendarCheck}
                    color="text-cyan-500"
                />
            </div>

            {/* Data Table - Conditional Rendering Based on View Mode */}
            {viewMode === 'users' ? (
                <DataTable
                    data={usersWithEventNames}
                    columns={columns}
                    onEdit={handleViewDetails}
                    editLabel="View Events"
                    showDelete={false}
                    searchKeys={['name', 'email', 'college']}
                    placeholder="Search by name, email, or college..."
                />
            ) : (
                <DataTable
                    data={eventsArray}
                    columns={[
                        { key: "eventName", label: "Event Name", sortable: true },
                        { key: "fest", label: "Fest", sortable: true },
                        { key: "date", label: "Date", sortable: true },
                        { key: "time", label: "Time" },
                        { key: "registrationCount", label: "Registrations", sortable: true },
                    ]}
                    onEdit={handleViewEventDetails}
                    editLabel="View Users"
                    showDelete={false}
                    searchKeys={['eventName', 'fest']}
                    placeholder="Search by event name or fest..."
                />
            )}

            {/* User Event Details Modal */}
            <Modal
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedUser(null);
                }}
                title={`Events Registered by ${selectedUser?.name || ''}`}
            >
                {selectedUser && (
                    <div className="space-y-4">
                        {/* User Info */}
                        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-400">Name:</span>
                                    <p className="font-medium">{selectedUser.name}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Email:</span>
                                    <p className="font-medium">{selectedUser.email}</p>
                                </div>
                                {selectedUser.phone && (
                                    <div>
                                        <span className="text-gray-400">Phone:</span>
                                        <p className="font-medium">{selectedUser.phone}</p>
                                    </div>
                                )}
                                {selectedUser.college && (
                                    <div>
                                        <span className="text-gray-400">College:</span>
                                        <p className="font-medium">{selectedUser.college}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Events List */}
                        <div>
                            {(() => {
                                // Remove duplicate events by eventId
                                const uniqueEvents = selectedUser.registeredEvents.reduce((acc, event) => {
                                    if (!acc.some(e => e.eventId === event.eventId)) {
                                        acc.push(event);
                                    }
                                    return acc;
                                }, [] as EventRegistration[]);

                                return (
                                    <>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <CalendarCheck className="w-5 h-5 text-cyan-500" />
                                            Registered Events ({uniqueEvents.length})
                                        </h3>
                                        
                                        {uniqueEvents.length === 0 ? (
                                            <p className="text-gray-400 text-center py-8">
                                                No events registered yet
                                            </p>
                                        ) : (
                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                {uniqueEvents.map((event) => (
                                                    <div
                                                        key={event.eventId}
                                                        className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between">
                                                                    <h4 className="font-semibold text-lg text-white">
                                                                        {event.eventName}
                                                                    </h4>
                                                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-medium ml-2">
                                                                        {eventRegistrationCounts[event.eventId] || 0} registrations
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-400 mt-1">
                                                                    {event.fest}
                                                                </p>
                                                                <div className="flex gap-4 mt-2 text-sm">
                                                                    <span className="text-gray-300">
                                                                        📅 {event.date}
                                                                    </span>
                                                                    <span className="text-gray-300">
                                                                        ⏰ {event.time}
                                                                    </span>
                                                                </div>
                                                                {event.teamName && (
                                                                    <p className="text-sm text-blue-400 mt-2">
                                                                        Team: {event.teamName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span
                                                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                                                        event.active
                                                                            ? 'bg-green-500/20 text-green-400'
                                                                            : 'bg-red-500/20 text-red-400'
                                                                    }`}
                                                                >
                                                                    {event.active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Event Users Modal */}
            <Modal
                isOpen={isEventDetailsOpen}
                onClose={() => {
                    setIsEventDetailsOpen(false);
                    setSelectedEvent(null);
                }}
                title={`Users Registered for ${selectedEvent?.eventName || ''}`}
            >
                {selectedEvent && (
                    <div className="space-y-4">
                        {/* Event Info */}
                        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-400">Event:</span>
                                    <p className="font-medium">{selectedEvent.eventName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Fest:</span>
                                    <p className="font-medium">{selectedEvent.fest}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Date:</span>
                                    <p className="font-medium">{selectedEvent.date}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Time:</span>
                                    <p className="font-medium">{selectedEvent.time}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Total Registrations:</span>
                                    <p className="font-medium text-blue-400">{selectedEvent.users.length}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400">Status:</span>
                                    <span
                                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            selectedEvent.active
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}
                                    >
                                        {selectedEvent.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Users List */}
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <UsersIcon className="w-5 h-5 text-blue-500" />
                                Registered Users ({selectedEvent.users.length})
                            </h3>
                            
                            {selectedEvent.users.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">
                                    No users registered yet
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {selectedEvent.users.map((user, idx) => (
                                        <div
                                            key={`${user.email}-${idx}`}
                                            className="bg-gray-800/30 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                                        >
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Name:</span>
                                                    <p className="font-medium text-white">{user.name}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Email:</span>
                                                    <p className="font-medium text-white">{user.email}</p>
                                                </div>
                                                {user.phone && (
                                                    <div>
                                                        <span className="text-gray-400">Phone:</span>
                                                        <p className="font-medium text-white">{user.phone}</p>
                                                    </div>
                                                )}
                                                {user.college && (
                                                    <div>
                                                        <span className="text-gray-400">College:</span>
                                                        <p className="font-medium text-white">{user.college}</p>
                                                    </div>
                                                )}
                                                {user.teamName && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-400">Team:</span>
                                                        <p className="font-medium text-blue-400">{user.teamName}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
