'use server';

/**
 * DATA FETCHER - SMART FALLBACK READS
 * ====================================
 * 
 * This module implements intelligent data fetching with automatic fallback:
 * 
 * READ STRATEGY:
 * 1. Try Appwrite first (primary source)
 * 2. If Appwrite unavailable → Fallback to Firebase Firestore
 * 3. Return data + source indicator
 * 
 * WRITE STRATEGY:
 * ⚠️ This module is READ-ONLY for data fetching!
 * 
 * For writes (create/update/delete):
 * → Always use '@/actions/appwrite' functions
 * → Never write directly to Firebase from admin UI
 * → Firebase sync happens automatically via real-time listener
 * 
 * Image handling:
 * → Images stored in Firebase Storage
 * → URLs stored in Appwrite (synced to Firebase Firestore)
 */

import { getUsers, getEvents, getTickets, getTransactions, getAttendance } from '@/actions/appwrite';
import {
    getFirestoreUsers,
    getFirestoreEvents,
    getFirestoreTickets,
    getFirestoreTransactions,
    getFirestoreAttendance,
} from '@/actions/firebase';

// Helper to check if Appwrite is available
async function checkAppwriteAvailable(): Promise<boolean> {
    try {
        // Quick health check - try to fetch users with limit
        const response = await getUsers();
        return response.documents !== undefined;
    } catch (error) {
        console.warn('Appwrite not available:', error);
        return false;
    }
}

// Fetch Users with smart fallback
export async function fetchUsers(fetchAll: boolean = false) {
    try {
        const isAppwriteAvailable = await checkAppwriteAvailable();
        
        if (isAppwriteAvailable) {
            // Get non-image data from Appwrite
            const { documents, total } = await getUsers(fetchAll);
            
            // Transform Appwrite data to include Firebase Storage image URLs
            const usersWithImages = documents.map((user: any) => ({
                ...user,
                id: user.$id,
                // Non-image data from Appwrite
                name: user.name,
                email: user.email,
                phone: user.phone,
                college: user.college,
                pass: user.pass,
                // Image URLs (certificates) - these are already stored as URLs
                certificates: user.certificates || [],
                createdAt: user.$createdAt,
                updatedAt: user.$updatedAt,
            }));
            
            return {
                users: usersWithImages,
                total,
                source: 'appwrite' as const,
                success: true,
            };
        } else {
            // Fallback to Firebase
            console.log('Fetching from Firebase (Appwrite unavailable)');
            const { users, total } = await getFirestoreUsers();
            return {
                users,
                total,
                source: 'firebase' as const,
                success: true,
            };
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        return {
            users: [],
            total: 0,
            source: 'error' as const,
            success: false,
            error: 'Failed to fetch users from both sources',
        };
    }
}

// Fetch Events with smart fallback
export async function fetchEvents(fetchAll: boolean = false) {
    try {
        const isAppwriteAvailable = await checkAppwriteAvailable();
        
        if (isAppwriteAvailable) {
            const { documents, total } = await getEvents(fetchAll);
            
            const eventsWithImages = documents.map((event: any) => ({
                ...event,
                id: event.$id,
                // Non-image data from Appwrite
                name: event.name,
                description: event.description,
                date: event.date,
                venue: event.venue,
                // Image URL from Firebase Storage
                imageUrl: event.imageUrl || event.image || null,
                createdAt: event.$createdAt,
                updatedAt: event.$updatedAt,
            }));
            
            return {
                events: eventsWithImages,
                total,
                source: 'appwrite' as const,
                success: true,
            };
        } else {
            console.log('Fetching from Firebase (Appwrite unavailable)');
            const { events, total } = await getFirestoreEvents();
            return {
                events,
                total,
                source: 'firebase' as const,
                success: true,
            };
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        return {
            events: [],
            total: 0,
            source: 'error' as const,
            success: false,
            error: 'Failed to fetch events from both sources',
        };
    }
}

// Fetch Tickets with smart fallback
export async function fetchTickets(fetchAll: boolean = false) {
    try {
        const isAppwriteAvailable = await checkAppwriteAvailable();
        
        if (isAppwriteAvailable) {
            const { documents, total } = await getTickets(fetchAll);
            
            const ticketsWithQR = documents.map((ticket: any) => ({
                ...ticket,
                id: ticket.$id,
                // Non-image data from Appwrite
                user_id: ticket.user_id,
                event_id: ticket.event_id,
                ticket_type: ticket.ticket_type,
                status: ticket.status,
                price: ticket.price,
                // QR Code URL from Firebase Storage
                qrCodeUrl: ticket.qrCodeUrl || ticket.qr_code || null,
                createdAt: ticket.$createdAt,
                updatedAt: ticket.$updatedAt,
            }));
            
            return {
                tickets: ticketsWithQR,
                total,
                source: 'appwrite' as const,
                success: true,
            };
        } else {
            console.log('Fetching from Firebase (Appwrite unavailable)');
            const { tickets, total } = await getFirestoreTickets();
            return {
                tickets,
                total,
                source: 'firebase' as const,
                success: true,
            };
        }
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return {
            tickets: [],
            total: 0,
            source: 'error' as const,
            success: false,
            error: 'Failed to fetch tickets from both sources',
        };
    }
}

// Fetch Transactions with smart fallback
export async function fetchTransactions(fetchAll: boolean = false) {
    try {
        const isAppwriteAvailable = await checkAppwriteAvailable();
        
        if (isAppwriteAvailable) {
            const { documents, total } = await getTransactions(fetchAll);
            
            const transactions = documents.map((transaction: any) => ({
                ...transaction,
                id: transaction.$id,
                user_id: transaction.user_id,
                ticket_id: transaction.ticket_id,
                amount: transaction.amount,
                status: transaction.status,
                payment_method: transaction.payment_method,
                createdAt: transaction.$createdAt,
                updatedAt: transaction.$updatedAt,
            }));
            
            return {
                transactions,
                total,
                source: 'appwrite' as const,
                success: true,
            };
        } else {
            console.log('Fetching from Firebase (Appwrite unavailable)');
            const { transactions, total } = await getFirestoreTransactions();
            return {
                transactions,
                total,
                source: 'firebase' as const,
                success: true,
            };
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return {
            transactions: [],
            total: 0,
            source: 'error' as const,
            success: false,
            error: 'Failed to fetch transactions from both sources',
        };
    }
}

// Fetch Attendance with smart fallback
export async function fetchAttendance(fetchAll: boolean = false) {
    try {
        const isAppwriteAvailable = await checkAppwriteAvailable();
        
        if (isAppwriteAvailable) {
            const { documents, total } = await getAttendance(fetchAll);
            
            const attendance = documents.map((record: any) => ({
                ...record,
                id: record.$id,
                event_id: record.event_id,
                user_id: record.user_id,
                ticket_id: record.ticket_id,
                status: record.status,
                checked_in_at: record.checked_in_at,
                createdAt: record.$createdAt,
                updatedAt: record.$updatedAt,
            }));
            
            return {
                attendance,
                total,
                source: 'appwrite' as const,
                success: true,
            };
        } else {
            console.log('Fetching from Firebase (Appwrite unavailable)');
            const { attendance, total } = await getFirestoreAttendance();
            return {
                attendance,
                total,
                source: 'firebase' as const,
                success: true,
            };
        }
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return {
            attendance: [],
            total: 0,
            source: 'error' as const,
            success: false,
            error: 'Failed to fetch attendance from both sources',
        };
    }
}

// Generic fetch with type parameter
export async function fetchData<T extends 'users' | 'events' | 'tickets' | 'transactions' | 'attendance'>(
    type: T,
    fetchAll: boolean = false
): Promise<any> {
    switch (type) {
        case 'users':
            return await fetchUsers(fetchAll);
        case 'events':
            return await fetchEvents(fetchAll);
        case 'tickets':
            return await fetchTickets(fetchAll);
        case 'transactions':
            return await fetchTransactions(fetchAll);
        case 'attendance':
            return await fetchAttendance(fetchAll);
        default:
            return {
                data: [],
                total: 0,
                source: 'error' as const,
                success: false,
                error: 'Invalid data type',
            };
    }
}

