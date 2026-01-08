'use server';

/**
 * SYNC OPERATIONS - APPWRITE → FIREBASE
 * ======================================
 * 
 * This module handles synchronization from Appwrite to Firebase.
 * 
 * SYNC FLOW:
 * 1. Real-time listener detects Appwrite changes (client-side)
 * 2. Calls /api/sync endpoint (server-side)
 * 3. These functions sync data to Firebase Firestore
 * 
 * AUTOMATIC SYNC:
 * → Triggered by Appwrite real-time events
 * → Upsert operations prevent duplicates
 * → Keeps Firebase Firestore in sync as backup
 * 
 * MANUAL SYNC:
 * → syncAllToFirebase() for full database sync
 * → Useful for initial setup or recovery
 * 
 * DATA FLOW:
 * Admin UI → Appwrite (primary) → [Real-time sync] → Firebase (backup)
 */

import { getUsers, getTickets, getEvents, getAttendance, getTransactions } from '@/actions/appwrite';
import {
    upsertFirestoreUser,
    upsertFirestoreEvent,
    upsertFirestoreTicket,
    upsertFirestoreTransaction,
    upsertFirestoreAttendance,
    getFirestoreUsers,
    updateFirestoreUser,
    deleteFirestoreUser,
    updateFirestoreEvent,
    deleteFirestoreEvent,
    updateFirestoreTransaction,
    deleteFirestoreTransaction,
} from '@/actions/firebase';

// Sync all data from Appwrite to Firebase
export async function syncAllToFirebase() {
    try {
        const results = await Promise.all([
            syncUsersToFirestore(),
            syncEventsToFirestore(),
            syncTicketsToFirestore(),
            syncTransactionsToFirestore(),
            syncAttendanceToFirestore(),
        ]);

        return {
            success: true,
            results: {
                users: results[0],
                events: results[1],
                tickets: results[2],
                transactions: results[3],
                attendance: results[4],
            }
        };
    } catch (error) {
        console.error('Error syncing all data:', error);
        return { success: false, error: 'Failed to sync all data' };
    }
}

// Sync Users to Firestore (with upsert - no duplicates)
export async function syncUsersToFirestore() {
    try {
        const { documents: appwriteUsers } = await getUsers();

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const user of appwriteUsers) {
            // Clean Appwrite metadata and use stud_id (user.$id)
            const userData = {
                appwriteId: user.$id,
                stud_id: user.$id, // Appwrite user ID
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                college: user.college || '',
                pass: user.pass || '',
                certificates: user.certificates || [],
                createdAt: user.$createdAt,
            };

            const result = await upsertFirestoreUser(userData);
            if (result.success) {
                if (result.action === 'created') {
                    synced++;
                } else if (result.action === 'updated') {
                    updated++;
                }
            } else {
                failed++;
            }
        }

        return { synced, updated, failed, total: appwriteUsers.length };
    } catch (error) {
        console.error('Error syncing users:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync users' };
    }
}

// Sync Events to Firestore (with upsert - no duplicates)
export async function syncEventsToFirestore() {
    try {
        const { documents: appwriteEvents } = await getEvents();

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const event of appwriteEvents) {
            const eventData = {
                appwriteId: event.$id,
                event_id: event.$id,
                event_name: event.event_name || '',
                venue: event.venue || '',
                time: event.time || '',
                amount: event.amount || '0',
                slots: event.slots || 0,
                category: event.category || 'General',
                fest: event.fest || '',
                event_pass: event.event_pass || '',
                date: event.date || '',
                winners: event.winners || [],
                coordinator: event.coordinator || [],
                completed: event.completed || false,
                poster: event.poster || '',
                event_rules: event.event_rules || '',
                details: event.details || '',
                phone_number: event.phone_number || '',
                createdAt: event.$createdAt,
            };

            const result = await upsertFirestoreEvent(eventData);
            if (result.success) {
                if (result.action === 'created') {
                    synced++;
                } else if (result.action === 'updated') {
                    updated++;
                }
            } else {
                failed++;
            }
        }

        return { synced, updated, failed, total: appwriteEvents.length };
    } catch (error) {
        console.error('Error syncing events:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync events' };
    }
}

// Sync Tickets to Firestore (with upsert - no duplicates)
export async function syncTicketsToFirestore() {
    try {
        const { documents: appwriteTickets } = await getTickets();

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const ticket of appwriteTickets) {
            const ticketData = {
                appwriteId: ticket.$id,
                user_id_appwrite: ticket.user_id || '', // Appwrite user ID - will be mapped to Firebase user doc ID
                event_id_appwrite: ticket.event_id || '', // Appwrite event ID - will be mapped to Firebase event doc ID
                ticket_number: ticket.ticket_number || '',
                status: ticket.status || '',
                createdAt: ticket.$createdAt,
            };

            const result = await upsertFirestoreTicket(ticketData);
            if (result.success) {
                if (result.action === 'created') {
                    synced++;
                } else if (result.action === 'updated') {
                    updated++;
                }
            } else {
                failed++;
            }
        }

        return { synced, updated, failed, total: appwriteTickets.length };
    } catch (error) {
        console.error('Error syncing tickets:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync tickets' };
    }
}

// Sync Transactions to Firestore (with upsert - no duplicates)
export async function syncTransactionsToFirestore() {
    try {
        const { documents: appwriteTransactions } = await getTransactions();

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const transaction of appwriteTransactions) {
            const transactionData = {
                appwriteId: transaction.$id,
                transition_id: transaction.transition_id || '',
                user_id_appwrite: transaction.user_id || '', // Appwrite user ID - will be mapped to Firebase user doc ID
                ticket_id_appwrite: transaction.ticket_id || '', // Appwrite ticket ID - will be mapped to Firebase ticket doc ID
                createdAt: transaction.$createdAt,
            };

            const result = await upsertFirestoreTransaction(transactionData);
            if (result.success) {
                if (result.action === 'created') {
                    synced++;
                } else if (result.action === 'updated') {
                    updated++;
                }
            } else {
                failed++;
            }
        }

        return { synced, updated, failed, total: appwriteTransactions.length };
    } catch (error) {
        console.error('Error syncing transactions:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync transactions' };
    }
}

// Sync Attendance to Firestore (with upsert - no duplicates)
export async function syncAttendanceToFirestore() {
    try {
        const { documents: appwriteAttendance } = await getAttendance();

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const attendance of appwriteAttendance) {
            const attendanceData = {
                appwriteId: attendance.$id,
                user_id_appwrite: attendance.user_id || '', // Appwrite user ID - will be mapped to Firebase user doc ID
                event_id_appwrite: attendance.event_id || '', // Appwrite event ID - will be mapped to Firebase event doc ID
                checked_in: attendance.checked_in || false,
                timestamp: attendance.timestamp || attendance.$createdAt,
            };

            const result = await upsertFirestoreAttendance(attendanceData);
            if (result.success) {
                if (result.action === 'created') {
                    synced++;
                } else if (result.action === 'updated') {
                    updated++;
                }
            } else {
                failed++;
            }
        }

        return { synced, updated, failed, total: appwriteAttendance.length };
    } catch (error) {
        console.error('Error syncing attendance:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync attendance' };
    }
}

// Sync single item by ID and type
export async function syncSingleItem(type: 'users' | 'events' | 'tickets' | 'transactions' | 'attendance', appwriteId: string) {
    try {
        let result;
        
        if (type === 'users') {
            const { documents: users } = await getUsers();
            const user = users.find((u: any) => u.$id === appwriteId);
            if (!user) return { success: false, error: 'User not found' };
            
            const userData = {
                appwriteId: user.$id,
                stud_id: user.$id,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                college: user.college || '',
                pass: user.pass || '',
                certificates: user.certificates || [],
            };
            result = await upsertFirestoreUser(userData);
        } 
        else if (type === 'events') {
            const { documents: events } = await getEvents();
            const event = events.find((e: any) => e.$id === appwriteId);
            if (!event) return { success: false, error: 'Event not found' };
            
            const eventData = {
                appwriteId: event.$id,
                event_id: event.$id,
                event_name: event.event_name || '',
                fest: event.fest || '',
                date: event.date || '',
                description: event.description || '',
            };
            result = await upsertFirestoreEvent(eventData);
        }
        else if (type === 'tickets') {
            const { documents: tickets } = await getTickets();
            const ticket = tickets.find((t: any) => t.$id === appwriteId);
            if (!ticket) return { success: false, error: 'Ticket not found' };
            
            const ticketData = {
                appwriteId: ticket.$id,
                user_id_appwrite: ticket.user_id || '',
                event_id_appwrite: ticket.event_id || '',
                ticket_number: ticket.ticket_number || '',
                status: ticket.status || '',
            };
            result = await upsertFirestoreTicket(ticketData);
        }
        else if (type === 'transactions') {
            const { documents: transactions } = await getTransactions();
            const transaction = transactions.find((t: any) => t.$id === appwriteId);
            if (!transaction) return { success: false, error: 'Transaction not found' };
            
            const transactionData = {
                appwriteId: transaction.$id,
                transition_id: transaction.transition_id || '',
                user_id_appwrite: transaction.user_id || '',
                ticket_id_appwrite: transaction.ticket_id || '',
            };
            result = await upsertFirestoreTransaction(transactionData);
        }
        else if (type === 'attendance') {
            const { documents: attendance } = await getAttendance();
            const record = attendance.find((a: any) => a.$id === appwriteId);
            if (!record) return { success: false, error: 'Attendance not found' };
            
            const attendanceData = {
                appwriteId: record.$id,
                user_id_appwrite: record.user_id || '',
                event_id_appwrite: record.event_id || '',
                checked_in: record.checked_in || false,
                timestamp: record.timestamp || record.$createdAt,
            };
            result = await upsertFirestoreAttendance(attendanceData);
        }

        return result || { success: false, error: 'Unknown type' };
    } catch (error) {
        console.error('Error syncing single item:', error);
        return { success: false, error: 'Failed to sync item' };
    }
}

