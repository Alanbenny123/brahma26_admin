'use client';

/**
 * REAL-TIME SYNC LISTENER
 * =======================
 * 
 * This module listens for changes in Appwrite and triggers Firebase sync.
 * 
 * ARCHITECTURE:
 * 1. Subscribes to Appwrite collections (client-side WebSocket)
 * 2. Detects create/update/delete events
 * 3. Calls /api/sync to update Firebase Firestore
 * 4. Keeps both databases synchronized
 * 
 * WHY CLIENT-SIDE LISTENER:
 * → Appwrite WebSocket subscriptions work in browser
 * → Server-side sync via /api/sync prevents CORS issues
 * → Separates concerns: listen (client) + sync (server)
 * 
 * DATA FLOW:
 * User action → Appwrite document changes → This listener detects
 * → POST to /api/sync → Firebase Firestore updated
 * 
 * This ensures Firebase is always a synchronized backup of Appwrite.
 */

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
                            console.log('✅ User synced to Firebase:', payload.$id, result.action || 'created');
                            console.log('   📊 Data:', { name: payload.name, email: payload.email });
                        } else {
                            console.error('❌ Failed to sync user to Firebase:', result.error);
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
                                    event_id: payload.$id,
                                    event_name: payload.event_name || '',
                                    venue: payload.venue || '',
                                    time: payload.time || '',
                                    amount: payload.amount || '0',
                                    slots: payload.slots || 0,
                                    category: payload.category || 'General',
                                    fest: payload.fest || '',
                                    event_pass: payload.event_pass || '',
                                    date: payload.date || '',
                                    winners: payload.winners || [],
                                    coordinator: payload.coordinator || [],
                                    completed: payload.completed || false,
                                    poster: payload.poster || '',
                                    event_rules: payload.event_rules || '',
                                    details: payload.details || '',
                                    phone_number: payload.phone_number || '',
                                    createdAt: payload.$createdAt,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Event synced to Firebase:', payload.$id, result.action || 'created');
                            console.log('   📊 Data:', { event_name: payload.event_name, date: payload.date });
                        } else {
                            console.error('❌ Failed to sync event to Firebase:', result.error);
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
                                    event_name: payload.event_name || '',
                                    venue: payload.venue || '',
                                    time: payload.time || '',
                                    amount: payload.amount || '0',
                                    slots: payload.slots || 0,
                                    category: payload.category || 'General',
                                    fest: payload.fest || '',
                                    event_pass: payload.event_pass || '',
                                    date: payload.date || '',
                                    winners: payload.winners || [],
                                    coordinator: payload.coordinator || [],
                                    completed: payload.completed || false,
                                    poster: payload.poster || '',
                                    event_rules: payload.event_rules || '',
                                    details: payload.details || '',
                                    phone_number: payload.phone_number || '',
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
                                    user_id_appwrite: payload.user_id, // Appwrite user ID - will be mapped to Firebase user doc ID
                                    event_id_appwrite: payload.event_id, // Appwrite event ID - will be mapped to Firebase event doc ID
                                    ticket_number: payload.ticket_number,
                                    status: payload.status,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Ticket synced to Firebase:', payload.$id, result.action || 'created');
                            console.log('   📊 Data:', { ticket_number: payload.ticket_number, status: payload.status });
                        } else {
                            console.error('❌ Failed to sync ticket to Firebase:', result.error);
                        }
                    }
                    else if (events.some(e => e.includes('update'))) {
                        // Ticket updated in Appwrite → Update in Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'tickets',
                                action: 'update',
                                id: payload.$id,
                                data: {
                                    ticket_number: payload.ticket_number,
                                    status: payload.status,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Ticket updated in Firebase:', payload.$id);
                        }
                    }
                    else if (events.some(e => e.includes('delete'))) {
                        // Ticket deleted in Appwrite → Delete from Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'tickets',
                                action: 'delete',
                                id: payload.$id,
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Ticket deleted from Firebase:', payload.$id);
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
                                    user_id_appwrite: payload.user_id, // Appwrite user ID - will be mapped to Firebase user doc ID
                                    ticket_id_appwrite: payload.ticket_id, // Appwrite ticket ID - will be mapped to Firebase ticket doc ID
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
                                    user_id_appwrite: payload.user_id, // Appwrite user ID - will be mapped to Firebase user doc ID
                                    event_id_appwrite: payload.event_id, // Appwrite event ID - will be mapped to Firebase event doc ID
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
                    else if (events.some(e => e.includes('update'))) {
                        // Attendance updated in Appwrite → Update in Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'attendance',
                                action: 'update',
                                id: payload.$id,
                                data: {
                                    event_id: payload.event_id,
                                    ticket_id: payload.ticket_id,
                                    stud_id: payload.stud_id,
                                }
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Attendance updated in Firebase:', payload.$id);
                        }
                    }
                    else if (events.some(e => e.includes('delete'))) {
                        // Attendance deleted in Appwrite → Delete from Firebase
                        const response = await fetch('/api/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'attendance',
                                action: 'delete',
                                id: payload.$id,
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            console.log('✅ Attendance deleted from Firebase:', payload.$id);
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

