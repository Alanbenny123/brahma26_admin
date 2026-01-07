'use client';

import { Client } from 'appwrite';

let client: Client | null = null;
let unsubscribers: (() => void)[] = [];

// Initialize Appwrite Client (client-side)
export function initializeRealtimeSync() {
    if (typeof window === 'undefined') return;
    if (client) return; // Already initialized

    client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

    // Subscribe to all collections
    subscribeToUsers();
    subscribeToEvents();
    subscribeToTickets();
    subscribeToTransactions();
    subscribeToAttendance();

    console.log('🔥 Real-time Appwrite → Firebase sync initialized');
}

// Stop all subscriptions
export function stopRealtimeSync() {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    console.log('🛑 Real-time sync stopped');
}

// Subscribe to Users collection
function subscribeToUsers() {
    if (!client) return;

    try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
        
        const unsubscribe = client.subscribe(
            `databases.${databaseId}.collections.users.documents`,
            async (response) => {
                const payload = response.payload as any;
                const events = response.events;

                console.log('👤 User event:', events[0], payload.$id);

                try {
                    if (events.some(e => e.includes('create'))) {
                        // New user created in Appwrite → Sync to Firebase (upsert prevents duplicates)
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'users',
                                action: 'create',
                                data: {
                                    appwriteId: payload.$id,
                                    stud_id: payload.$id, // Appwrite user ID
                                    name: payload.name,
                                    email: payload.email,
                                    phone: payload.phone,
                                    college: payload.college,
                                    pass: payload.pass,
                                    certificates: payload.certificates || [],
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ User synced to Firebase:', payload.$id, result.action || '');
                        }
                    } 
                    else if (events.some(e => e.includes('update'))) {
                        // User updated in Appwrite → Update in Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'users',
                                action: 'update',
                                id: payload.$id,
                                data: {
                                    name: payload.name,
                                    email: payload.email,
                                    phone: payload.phone,
                                    college: payload.college,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ User updated in Firebase:', payload.$id);
                        }
                    } 
                    else if (events.some(e => e.includes('delete'))) {
                        // User deleted in Appwrite → Delete from Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'users',
                                action: 'delete',
                                id: payload.$id,
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ User deleted from Firebase:', payload.$id);
                        }
                    }
                } catch (error) {
                    console.error('Error syncing user:', error);
                }
            }
        );

        unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error subscribing to users:', error);
    }
}

// Subscribe to Events collection
function subscribeToEvents() {
    if (!client) return;

    try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
        
        const unsubscribe = client.subscribe(
            `databases.${databaseId}.collections.events.documents`,
            async (response) => {
                const payload = response.payload as any;
                const events = response.events;

                console.log('📅 Event event:', events[0], payload.$id);

                try {
                    if (events.some(e => e.includes('create'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'events',
                                action: 'create',
                                data: {
                                    appwriteId: payload.$id,
                                    event_id: payload.$id, // Appwrite event ID
                                    event_name: payload.event_name,
                                    fest: payload.fest,
                                    date: payload.date,
                                    description: payload.description,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Event synced to Firebase:', payload.$id, result.action || '');
                        }
                    } 
                    else if (events.some(e => e.includes('update'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'events',
                                action: 'update',
                                id: payload.$id,
                                data: {
                                    event_name: payload.event_name,
                                    fest: payload.fest,
                                    date: payload.date,
                                    description: payload.description,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Event updated in Firebase:', payload.$id);
                        }
                    }
                    else if (events.some(e => e.includes('delete'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'events',
                                action: 'delete',
                                id: payload.$id,
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Event deleted from Firebase:', payload.$id);
                        }
                    }
                } catch (error) {
                    console.error('Error syncing event:', error);
                }
            }
        );

        unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error subscribing to events:', error);
    }
}

// Subscribe to Tickets collection
function subscribeToTickets() {
    if (!client) return;

    try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
        
        const unsubscribe = client.subscribe(
            `databases.${databaseId}.collections.tickets.documents`,
            async (response) => {
                const payload = response.payload as any;
                const events = response.events;

                console.log('🎫 Ticket event:', events[0], payload.$id);

                try {
                    if (events.some(e => e.includes('create'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'tickets',
                                action: 'create',
                                data: {
                                    appwriteId: payload.$id,
                                    ticket_id: payload.$id, // Appwrite ticket ID
                                    stud_id: payload.user_id, // References user.$id
                                    event_id: payload.event_id, // References event.$id
                                    ticket_number: payload.ticket_number,
                                    status: payload.status,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Ticket synced to Firebase:', payload.$id, result.action || '');
                        }
                    }
                } catch (error) {
                    console.error('Error syncing ticket:', error);
                }
            }
        );

        unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error subscribing to tickets:', error);
    }
}

// Subscribe to Transactions collection
function subscribeToTransactions() {
    if (!client) return;

    try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
        
        const unsubscribe = client.subscribe(
            `databases.${databaseId}.collections.transaction.documents`,
            async (response) => {
                const payload = response.payload as any;
                const events = response.events;

                console.log('💳 Transaction event:', events[0], payload.$id);

                try {
                    if (events.some(e => e.includes('create'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'transactions',
                                action: 'create',
                                data: {
                                    appwriteId: payload.$id,
                                    transition_id: payload.transition_id,
                                    stud_id: payload.user_id, // References user.$id
                                    ticket_id: payload.ticket_id, // References ticket.$id
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Transaction synced to Firebase:', payload.$id, result.action || '');
                        }
                    } 
                    else if (events.some(e => e.includes('update'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'transactions',
                                action: 'update',
                                id: payload.$id,
                                data: {
                                    transition_id: payload.transition_id,
                                    user_id: payload.user_id,
                                    ticket_id: payload.ticket_id,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Transaction updated in Firebase:', payload.$id);
                        }
                    }
                    else if (events.some(e => e.includes('delete'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'transactions',
                                action: 'delete',
                                id: payload.$id,
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Transaction deleted from Firebase:', payload.$id);
                        }
                    }
                } catch (error) {
                    console.error('Error syncing transaction:', error);
                }
            }
        );

        unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error subscribing to transactions:', error);
    }
}

// Subscribe to Attendance collection
function subscribeToAttendance() {
    if (!client) return;

    try {
        const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'default';
        
        const unsubscribe = client.subscribe(
            `databases.${databaseId}.collections.attendence.documents`,
            async (response) => {
                const payload = response.payload as any;
                const events = response.events;

                console.log('✅ Attendance event:', events[0], payload.$id);

                try {
                    if (events.some(e => e.includes('create'))) {
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'attendance',
                                action: 'create',
                                data: {
                                    appwriteId: payload.$id,
                                    stud_id: payload.user_id, // References user.$id
                                    event_id: payload.event_id, // References event.$id
                                    checked_in: payload.checked_in,
                                    timestamp: payload.timestamp || payload.$createdAt,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Attendance synced to Firebase:', payload.$id, result.action || '');
                        }
                    }
                } catch (error) {
                    console.error('Error syncing attendance:', error);
                }
            }
        );

        unsubscribers.push(unsubscribe);
    } catch (error) {
        console.error('Error subscribing to attendance:', error);
    }
}

