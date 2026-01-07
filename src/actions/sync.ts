'use server';

import { getUsers, getTickets, getEvents, getAttendance } from '@/actions/appwrite';
import {
    createFirestoreUser,
    createFirestoreEvent,
    createFirestoreTicket,
    createRTDBAttendance,
    getFirestoreUsers,
    updateFirestoreUser,
    deleteFirestoreUser,
    updateFirestoreEvent,
    deleteFirestoreEvent,
} from '@/actions/firebase';

// Sync all data from Appwrite to Firebase
export async function syncAllToFirebase() {
    try {
        const results = await Promise.all([
            syncUsersToFirestore(),
            syncEventsToFirestore(),
            syncTicketsToFirestore(),
            syncAttendanceToFirestore(),
        ]);

        return {
            success: true,
            results: {
                users: results[0],
                events: results[1],
                tickets: results[2],
                attendance: results[3],
            }
        };
    } catch (error) {
        console.error('Error syncing all data:', error);
        return { success: false, error: 'Failed to sync all data' };
    }
}

// Sync Users to Firestore
export async function syncUsersToFirestore() {
    try {
        const { documents: appwriteUsers } = await getUsers();
        const { users: existingFirestoreUsers } = await getFirestoreUsers();

        // Create a Set of existing Firebase user IDs
        const existingIds = new Set(existingFirestoreUsers.map((u: any) => u.appwriteId || u.id));

        let synced = 0;
        let skipped = 0;
        let failed = 0;

        for (const user of appwriteUsers) {
            // Skip if already exists
            if (existingIds.has(user.$id)) {
                skipped++;
                continue;
            }

            // Clean Appwrite metadata
            const userData = {
                appwriteId: user.$id,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                college: user.college || '',
                pass: user.pass || '',
                certificates: user.certificates || [],
                createdAt: user.$createdAt,
            };

            const result = await createFirestoreUser(userData);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }

        return { synced, skipped, failed, total: appwriteUsers.length };
    } catch (error) {
        console.error('Error syncing users:', error);
        return { synced: 0, skipped: 0, failed: 0, error: 'Failed to sync users' };
    }
}

// Sync Events to Firestore
export async function syncEventsToFirestore() {
    try {
        const { documents: appwriteEvents } = await getEvents();

        let synced = 0;
        let failed = 0;

        for (const event of appwriteEvents) {
            const eventData = {
                appwriteId: event.$id,
                event_name: event.event_name || '',
                fest: event.fest || '',
                date: event.date || '',
                description: event.description || '',
                createdAt: event.$createdAt,
            };

            const result = await createFirestoreEvent(eventData);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }

        return { synced, failed, total: appwriteEvents.length };
    } catch (error) {
        console.error('Error syncing events:', error);
        return { synced: 0, failed: 0, error: 'Failed to sync events' };
    }
}

// Sync Tickets to Firestore
export async function syncTicketsToFirestore() {
    try {
        const { documents: appwriteTickets } = await getTickets();

        let synced = 0;
        let failed = 0;

        for (const ticket of appwriteTickets) {
            const ticketData = {
                appwriteId: ticket.$id,
                user_id: ticket.user_id || '',
                event_id: ticket.event_id || '',
                ticket_number: ticket.ticket_number || '',
                status: ticket.status || '',
                createdAt: ticket.$createdAt,
            };

            const result = await createFirestoreTicket(ticketData);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }

        return { synced, failed, total: appwriteTickets.length };
    } catch (error) {
        console.error('Error syncing tickets:', error);
        return { synced: 0, failed: 0, error: 'Failed to sync tickets' };
    }
}

// Sync Attendance to Firestore
export async function syncAttendanceToFirestore() {
    try {
        const { documents: appwriteAttendance } = await getAttendance();

        let synced = 0;
        let failed = 0;

        for (const attendance of appwriteAttendance) {
            const attendanceData = {
                appwriteId: attendance.$id,
                user_id: attendance.user_id || '',
                event_id: attendance.event_id || '',
                checked_in: attendance.checked_in || false,
                timestamp: attendance.timestamp || attendance.$createdAt,
            };

            const result = await createRTDBAttendance(attendanceData);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }

        return { synced, failed, total: appwriteAttendance.length };
    } catch (error) {
        console.error('Error syncing attendance:', error);
        return { synced: 0, failed: 0, error: 'Failed to sync attendance' };
    }
}

// Sync single item by ID and type
export async function syncSingleItem(type: 'users' | 'events' | 'tickets' | 'attendance', appwriteId: string) {
    try {
        let result;
        
        if (type === 'users') {
            const { documents: users } = await getUsers();
            const user = users.find((u: any) => u.$id === appwriteId);
            if (!user) return { success: false, error: 'User not found' };
            
            const userData = {
                appwriteId: user.$id,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                college: user.college || '',
                pass: user.pass || '',
                certificates: user.certificates || [],
            };
            result = await createFirestoreUser(userData);
        } 
        else if (type === 'events') {
            const { documents: events } = await getEvents();
            const event = events.find((e: any) => e.$id === appwriteId);
            if (!event) return { success: false, error: 'Event not found' };
            
            const eventData = {
                appwriteId: event.$id,
                event_name: event.event_name || '',
                fest: event.fest || '',
                date: event.date || '',
                description: event.description || '',
            };
            result = await createFirestoreEvent(eventData);
        }
        else if (type === 'tickets') {
            const { documents: tickets } = await getTickets();
            const ticket = tickets.find((t: any) => t.$id === appwriteId);
            if (!ticket) return { success: false, error: 'Ticket not found' };
            
            const ticketData = {
                appwriteId: ticket.$id,
                user_id: ticket.user_id || '',
                event_id: ticket.event_id || '',
                ticket_number: ticket.ticket_number || '',
                status: ticket.status || '',
            };
            result = await createFirestoreTicket(ticketData);
        }
        else if (type === 'attendance') {
            const { documents: attendance } = await getAttendance();
            const record = attendance.find((a: any) => a.$id === appwriteId);
            if (!record) return { success: false, error: 'Attendance not found' };
            
            const attendanceData = {
                appwriteId: record.$id,
                user_id: record.user_id || '',
                event_id: record.event_id || '',
                checked_in: record.checked_in || false,
                timestamp: record.timestamp || record.$createdAt,
            };
            result = await createRTDBAttendance(attendanceData);
        }

        return result || { success: false, error: 'Unknown type' };
    } catch (error) {
        console.error('Error syncing single item:', error);
        return { success: false, error: 'Failed to sync item' };
    }
}

