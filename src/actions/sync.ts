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

import { getUsers, getTickets, getEvents, getAttendance, getTransactions, getIEE, getIEI } from '@/actions/appwrite';
import { getAdmins } from '@/actions/auth';
import {
    upsertFirestoreUser,
    upsertFirestoreEvent,
    upsertFirestoreTicket,
    upsertFirestoreTransaction,
    upsertFirestoreAttendance,
    upsertFirestoreAdmin,
    upsertFirestoreIEE,
    upsertFirestoreIEI,
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
            syncAdminsToFirestore(),
            syncIEEToFirestore(),
            syncIEIToFirestore(),
        ]);

        return {
            success: true,
            results: {
                users: results[0],
                events: results[1],
                tickets: results[2],
                transactions: results[3],
                attendance: results[4],
                admins: results[5],
                iee: results[6],
                iei: results[7],
            }
        };
    } catch (error) {
        console.error('Error syncing all data:', error);
        return { success: false, error: 'Failed to sync all data' };
    }
}

// Sync Users to Firestore (with upsert - no duplicates)
export async function syncUsersToFirestore(batchSize: number = 50, onProgress?: (progress: number, total: number) => void) {
    try {
        const { documents: appwriteUsers } = await getUsers(true); // Fetch all

        let synced = 0;
        let updated = 0;
        let failed = 0;
        const total = appwriteUsers.length;

        // Process in batches to avoid timeout
        for (let i = 0; i < appwriteUsers.length; i += batchSize) {
            const batch = appwriteUsers.slice(i, i + batchSize);
            
            // Process batch in parallel
            const batchPromises = batch.map(async (user) => {
                const userData = {
                    appwriteId: user.$id,
                    stud_id: user.$id,
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    college: user.college || '',
                    pass: user.pass || '',
                    certificates: user.certificates || [],
                    createdAt: user.$createdAt,
                };

                return await upsertFirestoreUser(userData);
            });

            const results = await Promise.all(batchPromises);
            
            results.forEach(result => {
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else {
                    failed++;
                }
            });

            // Report progress
            const processed = Math.min(i + batchSize, total);
            if (onProgress) {
                onProgress(processed, total);
            }
            
            console.log(`✅ Synced users batch: ${processed}/${total}`);
        }

        return { synced, updated, failed, total };
    } catch (error) {
        console.error('Error syncing users:', error);
        return { synced: 0, updated: 0, failed: 0, total: 0, error: 'Failed to sync users' };
    }
}

// Sync Events to Firestore (with upsert - no duplicates)
export async function syncEventsToFirestore(batchSize: number = 50, onProgress?: (progress: number, total: number) => void) {
    try {
        const { documents: appwriteEvents } = await getEvents(true);

        let synced = 0;
        let updated = 0;
        let failed = 0;
        const total = appwriteEvents.length;

        // Process in batches
        for (let i = 0; i < appwriteEvents.length; i += batchSize) {
            const batch = appwriteEvents.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (event) => {
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

                return await upsertFirestoreEvent(eventData);
            });

            const results = await Promise.all(batchPromises);
            
            results.forEach(result => {
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else {
                    failed++;
                }
            });

            const processed = Math.min(i + batchSize, total);
            if (onProgress) {
                onProgress(processed, total);
            }
            
            console.log(`✅ Synced events batch: ${processed}/${total}`);
        }

        return { synced, updated, failed, total };
    } catch (error) {
        console.error('Error syncing events:', error);
        return { synced: 0, updated: 0, failed: 0, total: 0, error: 'Failed to sync events' };
    }
}

// Sync Tickets to Firestore (with upsert - no duplicates)
export async function syncTicketsToFirestore(batchSize: number = 50, onProgress?: (progress: number, total: number) => void) {
    try {
        const { documents: appwriteTickets } = await getTickets(true);

        let synced = 0;
        let updated = 0;
        let failed = 0;
        const total = appwriteTickets.length;

        // Process in batches
        for (let i = 0; i < appwriteTickets.length; i += batchSize) {
            const batch = appwriteTickets.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (ticket) => {
                const ticketData = {
                    appwriteId: ticket.$id,
                    user_id_appwrite: ticket.user_id || '',
                    event_id_appwrite: ticket.event_id || '',
                    ticket_number: ticket.ticket_number || '',
                    status: ticket.status || '',
                    createdAt: ticket.$createdAt,
                };

                return await upsertFirestoreTicket(ticketData);
            });

            const results = await Promise.all(batchPromises);
            
            results.forEach(result => {
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else {
                    failed++;
                }
            });

            const processed = Math.min(i + batchSize, total);
            if (onProgress) {
                onProgress(processed, total);
            }
            
            console.log(`✅ Synced tickets batch: ${processed}/${total}`);
        }

        return { synced, updated, failed, total };
    } catch (error) {
        console.error('Error syncing tickets:', error);
        return { synced: 0, updated: 0, failed: 0, total: 0, error: 'Failed to sync tickets' };
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

/** Sync a single batch (offset/limit) for periodic 15s sync - avoids 504 timeout */
export type SyncCollection = 'users' | 'events' | 'tickets' | 'transactions' | 'attendance' | 'admins' | 'iee' | 'iei';

export async function syncSingleBatch(
    collection: SyncCollection,
    offset: number,
    limit: number = 50
): Promise<{ synced: number; updated: number; failed: number; total: number; nextOffset: number; done: boolean; error?: string }> {
    try {
        if (collection === 'users') {
            const { documents: batch, total } = await getUsers(false, { limit, offset });
            let synced = 0, updated = 0, failed = 0;
            for (const user of batch) {
                const userData = {
                    appwriteId: user.$id,
                    stud_id: user.$id,
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
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else failed++;
            }
            const nextOffset = offset + batch.length;
            return { synced, updated, failed, total, nextOffset, done: nextOffset >= total };
        }

        if (collection === 'events') {
            const { documents: batch, total } = await getEvents(false, { limit, offset });
            let synced = 0, updated = 0, failed = 0;
            for (const event of batch) {
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
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else failed++;
            }
            const nextOffset = offset + batch.length;
            return { synced, updated, failed, total, nextOffset, done: nextOffset >= total };
        }

        if (collection === 'tickets') {
            const { documents: batch, total } = await getTickets(false, { limit, offset });
            let synced = 0, updated = 0, failed = 0;
            for (const ticket of batch) {
                const ticketData = {
                    appwriteId: ticket.$id,
                    user_id_appwrite: ticket.user_id || '',
                    event_id_appwrite: ticket.event_id || '',
                    ticket_number: ticket.ticket_number || '',
                    status: ticket.status || '',
                    createdAt: ticket.$createdAt,
                };
                const result = await upsertFirestoreTicket(ticketData);
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else failed++;
            }
            const nextOffset = offset + batch.length;
            return { synced, updated, failed, total, nextOffset, done: nextOffset >= total };
        }

        if (collection === 'transactions') {
            const { documents: batch, total } = await getTransactions(false, { limit, offset });
            let synced = 0, updated = 0, failed = 0;
            for (const transaction of batch) {
                const transactionData = {
                    appwriteId: transaction.$id,
                    transition_id: transaction.transition_id || '',
                    user_id_appwrite: transaction.user_id || '',
                    ticket_id_appwrite: transaction.ticket_id || '',
                    createdAt: transaction.$createdAt,
                };
                const result = await upsertFirestoreTransaction(transactionData);
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else failed++;
            }
            const nextOffset = offset + batch.length;
            return { synced, updated, failed, total, nextOffset, done: nextOffset >= total };
        }

        if (collection === 'attendance') {
            const { documents: batch, total } = await getAttendance(false, { limit, offset });
            let synced = 0, updated = 0, failed = 0;
            for (const attendance of batch) {
                const attendanceData = {
                    appwriteId: attendance.$id,
                    user_id_appwrite: attendance.user_id || '',
                    event_id_appwrite: attendance.event_id || '',
                    checked_in: attendance.checked_in || false,
                    timestamp: attendance.timestamp || attendance.$createdAt,
                };
                const result = await upsertFirestoreAttendance(attendanceData);
                if (result.success) {
                    if (result.action === 'created') synced++;
                    else if (result.action === 'updated') updated++;
                } else failed++;
            }
            const nextOffset = offset + batch.length;
            return { synced, updated, failed, total, nextOffset, done: nextOffset >= total };
        }

        // Small collections: full sync in one go
        if (collection === 'admins') {
            const result = await syncAdminsToFirestore();
            return { ...result, total: result.total ?? 0, nextOffset: result.total ?? 0, done: true };
        }
        if (collection === 'iee') {
            const result = await syncIEEToFirestore();
            return { ...result, total: result.total ?? 0, nextOffset: result.total ?? 0, done: true };
        }
        if (collection === 'iei') {
            const result = await syncIEIToFirestore();
            return { ...result, total: result.total ?? 0, nextOffset: result.total ?? 0, done: true };
        }

        return { synced: 0, updated: 0, failed: 0, total: 0, nextOffset: 0, done: true };
    } catch (error) {
        console.error('Error syncing batch:', error);
        return {
            synced: 0,
            updated: 0,
            failed: 0,
            total: 0,
            nextOffset: offset,
            done: false,
            error: error instanceof Error ? error.message : String(error),
        };
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

// Sync Admins to Firestore (with upsert - no duplicates)
export async function syncAdminsToFirestore() {
    try {
        const { documents: appwriteAdmins } = await getAdmins(true); // Fetch all admins

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const admin of appwriteAdmins) {
            const adminData = {
                appwriteId: admin.$id,
                email: admin.email || '',
                pass: admin.pass || '',
                log_in: admin.log_in || null,
                log_out: admin.log_out || null,
                session_token: admin.session_token || '',
                createdAt: admin.$createdAt,
            };

            const result = await upsertFirestoreAdmin(adminData);
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

        return { synced, updated, failed, total: appwriteAdmins.length };
    } catch (error) {
        console.error('Error syncing admins:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync admins' };
    }
}

// Sync IEE to Firestore (with upsert - no duplicates)
export async function syncIEEToFirestore() {
    try {
        const { documents: appwriteIEE } = await getIEE(true); // Fetch all IEE records

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const iee of appwriteIEE) {
            const ieeData = {
                appwriteId: iee.$id,
                mebership_id: iee.mebership_id || '',
                validity: iee.validity || false,
                createdAt: iee.$createdAt,
            };

            const result = await upsertFirestoreIEE(ieeData);
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

        return { synced, updated, failed, total: appwriteIEE.length };
    } catch (error) {
        console.error('Error syncing IEE:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync IEE' };
    }
}

// Sync IEI to Firestore (with upsert - no duplicates)
export async function syncIEIToFirestore() {
    try {
        const { documents: appwriteIEI } = await getIEI(true); // Fetch all IEI records

        let synced = 0;
        let updated = 0;
        let failed = 0;

        for (const iei of appwriteIEI) {
            const ieiData = {
                appwriteId: iei.$id,
                mebership_id: iei.mebership_id || '',
                validity: iei.validity || false,
                createdAt: iei.$createdAt,
            };

            const result = await upsertFirestoreIEI(ieiData);
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

        return { synced, updated, failed, total: appwriteIEI.length };
    } catch (error) {
        console.error('Error syncing IEI:', error);
        return { synced: 0, updated: 0, failed: 0, error: 'Failed to sync IEI' };
    }
}
