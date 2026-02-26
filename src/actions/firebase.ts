'use server';

/**
 * FIREBASE ACTIONS - SYNC & FALLBACK ONLY
 * ========================================
 * 
 * IMPORTANT: These functions are for SYNC and FALLBACK operations ONLY!
 * 
 * DO NOT call these directly from admin UI components!
 * 
 * These functions should only be used by:
 * 1. /api/sync endpoint (for real-time synchronization from Appwrite)
 * 2. data-fetcher.ts (for fallback reads when Appwrite is unavailable)
 * 3. Manual sync operations (sync.ts)
 * 
 * For admin operations (create/update/delete):
 * → Use functions from '@/actions/appwrite'
 * → Data will automatically sync to Firebase via real-time listener
 * 
 * Firebase Storage exceptions:
 * → Images ARE stored directly in Firebase Storage (not Appwrite)
 * → Image URLs are then stored in Appwrite → synced to Firebase Firestore
 */

import { db, rtdb } from '@/lib/firebase';
import { formatTime, formatDate } from '@/lib/date-utils';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import {
    ref,
    get,
    set,
    update,
    remove,
    push,
    child,
} from 'firebase/database';

// ============= UTILITY FUNCTIONS =============

/**
 * Format event rules: Add newline after each period (full stop)
 * Input: "Rule 1. Rule 2. Rule 3."
 * Output: "Rule 1.\nRule 2.\nRule 3."
 */
function formatEventRules(rulesText: string | undefined): string {
    if (!rulesText || typeof rulesText !== 'string') return '';
    
    // Replace ". " with ".\n" (period + space becomes period + newline)
    // Also handle cases where period is at end of line without space
    return rulesText
        .replace(/\.\s+/g, '.\n')  // Period followed by spaces
        .replace(/\.(?=[A-Z0-9])/g, '.\n')  // Period followed by capital letter/number
        .trim();
}

// ============= FIRESTORE OPERATIONS =============

// Helper function to check if document exists by appwriteId
async function getDocumentByAppwriteId(collectionName: string, appwriteId: string) {
    try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where('appwriteId', '==', appwriteId), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            return { exists: true, id: docSnap.id, data: docSnap.data() };
        }
        return { exists: false, id: null, data: null };
    } catch (error) {
        console.error('Error checking document:', error);
        return { exists: false, id: null, data: null };
    }
}

// Helper to get Firebase document ID by Appwrite ID
export async function getFirebaseIdByAppwriteId(collectionName: string, appwriteId: string) {
    const result = await getDocumentByAppwriteId(collectionName, appwriteId);
    return result.id;
}

// Users Collection
export async function getFirestoreUsers() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { users, total: users.length };
    } catch (error) {
        console.error('Error fetching users:', error);
        return { users: [], total: 0, error: 'Failed to fetch users' };
    }
}

export async function getFirestoreUser(userId: string) {
    try {
        const userRef = doc(db, 'users', userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return { user: { id: snapshot.id, ...snapshot.data() } };
        }
        return { user: null, error: 'User not found' };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { user: null, error: 'Failed to fetch user' };
    }
}

export async function createFirestoreUser(userData: any) {
    try {
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
            ...userData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: 'Failed to create user' };
    }
}

// Upsert User (Create or Update) - Uses Appwrite ID as Firebase document ID
// Note: Images (certificates) should be uploaded to Firebase Storage first
// and only the URLs should be stored in Firestore
export async function upsertFirestoreUser(userData: any) {
    try {
        if (!userData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite ID as the Firebase document ID
        const userDocId = userData.appwriteId;
        const userRef = doc(db, 'users', userDocId);
        
        // Ensure certificates is an array of URLs (not files)
        const certificateUrls = Array.isArray(userData.certificates) 
            ? userData.certificates 
            : [];
        
        // Check if document exists
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            // Update existing user
            await updateDoc(userRef, {
                ...userData,
                certificates: certificateUrls, // Store URLs only
                updatedAt: Timestamp.now(),
            });
            return { id: userDocId, firebaseId: userDocId, success: true, action: 'updated' };
        } else {
            // Create new user with specific document ID
            const dataToSave = {
                ...userData,
                certificates: certificateUrls, // Store URLs only
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            await setDoc(userRef, dataToSave);
            console.log('✅ Firebase: User created successfully:', userDocId);
            return { id: userDocId, firebaseId: userDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting user:', error);
        return { success: false, error: 'Failed to upsert user' };
    }
}

export async function updateFirestoreUser(userId: string, userData: any) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...userData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: 'Failed to update user' };
    }
}

export async function deleteFirestoreUser(userId: string) {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}

// Events Collection
export async function getFirestoreEvents() {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { events, total: events.length };
    } catch (error) {
        console.error('Error fetching events:', error);
        return { events: [], total: 0, error: 'Failed to fetch events' };
    }
}

export async function createFirestoreEvent(eventData: any) {
    try {
        const eventsRef = collection(db, 'events');
        const docRef = await addDoc(eventsRef, {
            ...eventData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating event:', error);
        return { success: false, error: 'Failed to create event' };
    }
}

export async function updateFirestoreEvent(eventId: string, eventData: any) {
    try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            ...eventData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating event:', error);
        return { success: false, error: 'Failed to update event' };
    }
}

export async function deleteFirestoreEvent(eventId: string) {
    try {
        const eventRef = doc(db, 'events', eventId);
        await deleteDoc(eventRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting event:', error);
        return { success: false, error: 'Failed to delete event' };
    }
}

// Helper to check if duplicate event exists in Firebase
async function checkFirebaseEventExists(eventName: string, eventDate: string, excludeId?: string) {
    try {
        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('event_name', '==', eventName),
            where('date', '==', eventDate)
        );
        const snapshot = await getDocs(q);
        
        if (excludeId) {
            const duplicates = snapshot.docs.filter(doc => doc.id !== excludeId);
            return duplicates.length > 0;
        }
        
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking Firebase event existence:', error);
        return false;
    }
}

// Upsert Event (Create or Update) - Uses Appwrite ID as Firebase document ID
// Note: Event images should be uploaded to Firebase Storage first
// and only the URL should be stored in Firestore
export async function upsertFirestoreEvent(eventData: any) {
    try {
        if (!eventData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Format date and time before storing
        if (eventData.date) {
            eventData.date = formatDate(eventData.date);
        }
        if (eventData.time) {
            eventData.time = formatTime(eventData.time);
        }

        // Format event rules: Add newline after each period
        if (eventData.event_rules) {
            eventData.event_rules = formatEventRules(eventData.event_rules);
        }

        // Use Appwrite ID as the Firebase document ID
        const eventDocId = eventData.appwriteId;
        const eventRef = doc(db, 'events', eventDocId);
        
        // If image URL is provided, store it; otherwise keep existing or set to null
        const imageUrl = eventData.imageUrl || eventData.image || null;
        
        // Check if document exists
        const docSnap = await getDoc(eventRef);

        if (docSnap.exists()) {
            // Update existing event
            await updateDoc(eventRef, {
                ...eventData,
                imageUrl: imageUrl, // Store image URL
                updatedAt: Timestamp.now(),
            });
            return { id: eventDocId, firebaseId: eventDocId, success: true, action: 'updated' };
        } else {
            // Create new event with specific document ID
            const dataToSave = {
                ...eventData,
                imageUrl: imageUrl, // Store image URL
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            await setDoc(eventRef, dataToSave);
            console.log('✅ Firebase: Event created successfully:', eventDocId);
            return { id: eventDocId, firebaseId: eventDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting event:', error);
        return { success: false, error: 'Failed to upsert event' };
    }
}

// Tickets Collection
export async function getFirestoreTickets() {
    try {
        const ticketsRef = collection(db, 'tickets');
        const snapshot = await getDocs(ticketsRef);
        const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { tickets, total: tickets.length };
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return { tickets: [], total: 0, error: 'Failed to fetch tickets' };
    }
}

export async function createFirestoreTicket(ticketData: any) {
    try {
        const ticketsRef = collection(db, 'tickets');
        const docRef = await addDoc(ticketsRef, {
            ...ticketData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, error: 'Failed to create ticket' };
    }
}

// Upsert Ticket (Create or Update) - Uses Appwrite ID as Firebase document ID
// Note: QR codes should be uploaded to Firebase Storage first
// and only the URL should be stored in Firestore
export async function upsertFirestoreTicket(ticketData: any) {
    try {
        if (!ticketData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite IDs directly as Firebase document IDs for references
        if (ticketData.user_id_appwrite) {
            ticketData.stud_id = ticketData.user_id_appwrite; // Appwrite user ID = Firebase user doc ID
        }

        if (ticketData.event_id_appwrite) {
            ticketData.event_id = ticketData.event_id_appwrite; // Appwrite event ID = Firebase event doc ID
        }

        // QR code URL
        const qrCodeUrl = ticketData.qrCodeUrl || ticketData.qr_code || null;

        // Use Appwrite ID as the Firebase document ID
        const ticketDocId = ticketData.appwriteId;
        const ticketRef = doc(db, 'tickets', ticketDocId);
        
        // Check if document exists
        const docSnap = await getDoc(ticketRef);

        if (docSnap.exists()) {
            // Update existing ticket
            await updateDoc(ticketRef, {
                ...ticketData,
                qrCodeUrl: qrCodeUrl, // Store QR code URL
                updatedAt: Timestamp.now(),
            });
            return { id: ticketDocId, firebaseId: ticketDocId, success: true, action: 'updated' };
        } else {
            // Create new ticket with specific document ID
            await setDoc(ticketRef, {
                ...ticketData,
                qrCodeUrl: qrCodeUrl, // Store QR code URL
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: ticketDocId, firebaseId: ticketDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting ticket:', error);
        return { success: false, error: 'Failed to upsert ticket' };
    }
}

export async function deleteFirestoreTicket(ticketId: string) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        await deleteDoc(ticketRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting ticket:', error);
        return { success: false, error: 'Failed to delete ticket' };
    }
}

export async function updateFirestoreTicket(ticketId: string, ticketData: any) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        await updateDoc(ticketRef, {
            ...ticketData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false, error: 'Failed to update ticket' };
    }
}

// Joined query: tickets enriched with event name/fest
export async function getFirestoreTicketsWithEvents() {
    try {
        const [ticketsResult, eventsResult] = await Promise.all([
            getFirestoreTickets(),
            getFirestoreEvents(),
        ]);
        const eMap = new Map((eventsResult.events || []).map((e: any) => [e.id, e]));
        const enriched = (ticketsResult.tickets || []).map((ticket: any) => ({
            ...ticket,
            event_name: eMap.get(ticket.event_id)?.event_name || 'Unknown Event',
            fest: eMap.get(ticket.event_id)?.fest || 'Unknown Fest',
        }));
        return { tickets: enriched, total: enriched.length };
    } catch (error) {
        console.error('Error fetching tickets with events:', error);
        return { tickets: [], total: 0, error: 'Failed to fetch tickets with events' };
    }
}

// Joined query: users enriched with their registered events
export async function getFirestoreUsersWithEvents() {
    try {
        const [usersResult, ticketsResult, eventsResult] = await Promise.all([
            getFirestoreUsers(),
            getFirestoreTickets(),
            getFirestoreEvents(),
        ]);
        const eventsMap = new Map((eventsResult.events || []).map((e: any) => [e.id, e]));
        const userTicketsMap = new Map<string, any[]>();
        for (const ticket of (ticketsResult.tickets || []) as any[]) {
            const studIds: string[] = Array.isArray(ticket.stud_id) ? ticket.stud_id : [];
            for (const studId of studIds) {
                if (!userTicketsMap.has(studId)) userTicketsMap.set(studId, []);
                userTicketsMap.get(studId)!.push(ticket);
            }
        }
        const users = (usersResult.users || []).map((user: any) => {
            const userTickets = userTicketsMap.get(user.id) || [];
            const registeredEvents = userTickets
                .map((t: any) => eventsMap.get(t.event_id))
                .filter(Boolean);
            return { ...user, registeredEvents };
        });
        return { users, total: users.length };
    } catch (error) {
        console.error('Error fetching users with events:', error);
        return { users: [], total: 0, error: 'Failed to fetch users with events' };
    }
}

// Firebase-native issueTicket: add a studentId to ticket.stud_id
export async function firebaseIssueTicket(ticketId: string, studentId: string) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found' };
        const ticket = ticketSnap.data();
        const currentStudIds: string[] = Array.isArray(ticket.stud_id) ? ticket.stud_id : [];
        if (currentStudIds.includes(studentId)) return { success: false, error: 'Student already assigned to this ticket' };
        await updateDoc(ticketRef, { stud_id: [...currentStudIds, studentId], updatedAt: Timestamp.now() });
        return { success: true, message: `Ticket issued to student ${studentId}` };
    } catch (error) {
        console.error('Error issuing ticket:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to issue ticket' };
    }
}

// Firebase-native cancelTicket: remove a studentId from ticket.stud_id
export async function firebaseCancelTicket(ticketId: string, studentId: string) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);
        if (!ticketSnap.exists()) return { success: false, error: 'Ticket not found' };
        const ticket = ticketSnap.data();
        const currentStudIds: string[] = Array.isArray(ticket.stud_id) ? ticket.stud_id : [];
        if (!currentStudIds.includes(studentId)) return { success: false, error: 'Student not assigned to this ticket' };
        await updateDoc(ticketRef, { stud_id: currentStudIds.filter(id => id !== studentId), updatedAt: Timestamp.now() });
        return { success: true, message: `Ticket cancelled for student ${studentId}` };
    } catch (error) {
        console.error('Error cancelling ticket:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel ticket' };
    }
}

// Firebase-native createTicketWithTransactions
export async function firebaseCreateTicketWithTransactions(ticketData: any, studentIds: string[], transactionIds: string[]) {
    try {
        if (!ticketData.event_id) return { success: false, error: 'Event ID is required' };
        const newTicketId = crypto.randomUUID();
        const ticketRef = doc(db, 'tickets', newTicketId);
        await setDoc(ticketRef, {
            event_id: ticketData.event_id,
            team_name: ticketData.team_name || '',
            active: ticketData.active ?? true,
            stud_id: studentIds,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        const transactionsCreated: string[] = [];
        for (let i = 0; i < studentIds.length; i++) {
            const studentId = studentIds[i];
            const transitionId = transactionIds[i] || '';
            const txId = crypto.randomUUID();
            const txRef = doc(db, 'transactions', txId);
            await setDoc(txRef, {
                stud_id: studentId,
                ticket_id: newTicketId,
                transition_id: transitionId,
                amount: ticketData.amount || 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            transactionsCreated.push(txId);
        }
        return {
            success: true,
            ticketId: newTicketId,
            transactionsCreated: transactionsCreated.length,
            totalStudents: studentIds.length,
            message: `Ticket created with ${studentIds.length} student(s) and ${transactionsCreated.length} transaction(s)`,
        };
    } catch (error) {
        console.error('Error creating ticket with transactions:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create ticket' };
    }
}

// Transactions Collection
export async function getFirestoreTransactions() {
    try {
        const transactionsRef = collection(db, 'transactions');
        const snapshot = await getDocs(transactionsRef);
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { transactions, total: transactions.length };
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return { transactions: [], total: 0, error: 'Failed to fetch transactions' };
    }
}

export async function createFirestoreTransaction(transactionData: any) {
    try {
        const transactionsRef = collection(db, 'transactions');
        const docRef = await addDoc(transactionsRef, {
            ...transactionData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating transaction:', error);
        return { success: false, error: 'Failed to create transaction' };
    }
}

export async function updateFirestoreTransaction(transactionId: string, transactionData: any) {
    try {
        const transactionRef = doc(db, 'transactions', transactionId);
        await updateDoc(transactionRef, {
            ...transactionData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating transaction:', error);
        return { success: false, error: 'Failed to update transaction' };
    }
}

export async function deleteFirestoreTransaction(transactionId: string) {
    try {
        const transactionRef = doc(db, 'transactions', transactionId);
        await deleteDoc(transactionRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return { success: false, error: 'Failed to delete transaction' };
    }
}

// Upsert Transaction (Create or Update) - Uses Appwrite ID as Firebase document ID
export async function upsertFirestoreTransaction(transactionData: any) {
    try {
        if (!transactionData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite IDs directly as Firebase document IDs for references
        if (transactionData.user_id_appwrite) {
            transactionData.stud_id = transactionData.user_id_appwrite; // Appwrite user ID = Firebase user doc ID
        }

        if (transactionData.ticket_id_appwrite) {
            transactionData.ticket_id = transactionData.ticket_id_appwrite; // Appwrite ticket ID = Firebase ticket doc ID
        }

        // Use Appwrite ID as the Firebase document ID
        const transactionDocId = transactionData.appwriteId;
        const transactionRef = doc(db, 'transactions', transactionDocId);
        
        // Check if document exists
        const docSnap = await getDoc(transactionRef);

        if (docSnap.exists()) {
            // Update existing transaction
            await updateDoc(transactionRef, {
                ...transactionData,
                updatedAt: Timestamp.now(),
            });
            return { id: transactionDocId, firebaseId: transactionDocId, success: true, action: 'updated' };
        } else {
            // Create new transaction with specific document ID
            await setDoc(transactionRef, {
                ...transactionData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: transactionDocId, firebaseId: transactionDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting transaction:', error);
        return { success: false, error: 'Failed to upsert transaction' };
    }
}

// Attendance Collection (Firestore)
export async function getFirestoreAttendance() {
    try {
        const attendanceRef = collection(db, 'attendance');
        const snapshot = await getDocs(attendanceRef);
        const attendance = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return { attendance, total: attendance.length };
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return { attendance: [], total: 0, error: 'Failed to fetch attendance' };
    }
}

export async function createFirestoreAttendance(attendanceData: any) {
    try {
        const attendanceRef = collection(db, 'attendance');
        const docRef = await addDoc(attendanceRef, {
            ...attendanceData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating attendance:', error);
        return { success: false, error: 'Failed to create attendance' };
    }
}

// Upsert Attendance (Create or Update) - Uses Appwrite ID as Firebase document ID
export async function upsertFirestoreAttendance(attendanceData: any) {
    try {
        if (!attendanceData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite IDs directly as Firebase document IDs for references
        if (attendanceData.user_id_appwrite) {
            attendanceData.stud_id = attendanceData.user_id_appwrite; // Appwrite user ID = Firebase user doc ID
        }

        if (attendanceData.event_id_appwrite) {
            attendanceData.event_id = attendanceData.event_id_appwrite; // Appwrite event ID = Firebase event doc ID
        }

        // Use Appwrite ID as the Firebase document ID
        const attendanceDocId = attendanceData.appwriteId;
        const attendanceRef = doc(db, 'attendance', attendanceDocId);
        
        // Check if document exists
        const docSnap = await getDoc(attendanceRef);

        if (docSnap.exists()) {
            // Update existing attendance
            await updateDoc(attendanceRef, {
                ...attendanceData,
                updatedAt: Timestamp.now(),
            });
            return { id: attendanceDocId, firebaseId: attendanceDocId, success: true, action: 'updated' };
        } else {
            // Create new attendance with specific document ID
            await setDoc(attendanceRef, {
                ...attendanceData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: attendanceDocId, firebaseId: attendanceDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting attendance:', error);
        return { success: false, error: 'Failed to upsert attendance' };
    }
}

export async function updateFirestoreAttendance(attendanceId: string, data: any) {
    try {
        const attendanceRef = doc(db, 'attendance', attendanceId);
        await updateDoc(attendanceRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating attendance:', error);
        return { success: false, error: 'Failed to update attendance' };
    }
}

export async function deleteFirestoreAttendance(attendanceId: string) {
    try {
        const attendanceRef = doc(db, 'attendance', attendanceId);
        await deleteDoc(attendanceRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting attendance:', error);
        return { success: false, error: 'Failed to delete attendance' };
    }
}

// ============= REALTIME DATABASE OPERATIONS =============

// Users in Realtime Database
export async function getRTDBUsers() {
    try {
        if (!rtdb) return { users: [], total: 0, error: 'Realtime Database not configured' };
        const usersRef = ref(rtdb, 'users');
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
            const usersData = snapshot.val();
            const users = Object.keys(usersData).map(key => ({
                id: key,
                ...usersData[key]
            }));
            return { users, total: users.length };
        }
        return { users: [], total: 0 };
    } catch (error) {
        console.error('Error fetching users from RTDB:', error);
        return { users: [], total: 0, error: 'Failed to fetch users' };
    }
}

export async function createRTDBUser(userData: any) {
    try {
        if (!rtdb) return { success: false, error: 'Realtime Database not configured' };
        const usersRef = ref(rtdb, 'users');
        const newUserRef = push(usersRef);
        await set(newUserRef, {
            ...userData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return { id: newUserRef.key, success: true };
    } catch (error) {
        console.error('Error creating user in RTDB:', error);
        return { success: false, error: 'Failed to create user' };
    }
}

export async function updateRTDBUser(userId: string, userData: any) {
    try {
        if (!rtdb) return { success: false, error: 'Realtime Database not configured' };
        const userRef = ref(rtdb, `users/${userId}`);
        await update(userRef, {
            ...userData,
            updatedAt: Date.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user in RTDB:', error);
        return { success: false, error: 'Failed to update user' };
    }
}

export async function deleteRTDBUser(userId: string) {
    try {
        if (!rtdb) return { success: false, error: 'Realtime Database not configured' };
        const userRef = ref(rtdb, `users/${userId}`);
        await remove(userRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user from RTDB:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}

// Events in Realtime Database
export async function getRTDBEvents() {
    try {
        if (!rtdb) return { events: [], total: 0, error: 'Realtime Database not configured' };
        const eventsRef = ref(rtdb, 'events');
        const snapshot = await get(eventsRef);
        if (snapshot.exists()) {
            const eventsData = snapshot.val();
            const events = Object.keys(eventsData).map(key => ({
                id: key,
                ...eventsData[key]
            }));
            return { events, total: events.length };
        }
        return { events: [], total: 0 };
    } catch (error) {
        console.error('Error fetching events from RTDB:', error);
        return { events: [], total: 0, error: 'Failed to fetch events' };
    }
}

export async function createRTDBEvent(eventData: any) {
    try {
        if (!rtdb) return { success: false, error: 'Realtime Database not configured' };
        const eventsRef = ref(rtdb, 'events');
        const newEventRef = push(eventsRef);
        await set(newEventRef, {
            ...eventData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return { id: newEventRef.key, success: true };
    } catch (error) {
        console.error('Error creating event in RTDB:', error);
        return { success: false, error: 'Failed to create event' };
    }
}

// Attendance in Realtime Database
export async function getRTDBAttendance() {
    try {
        if (!rtdb) return { attendance: [], total: 0, error: 'Realtime Database not configured' };
        const attendanceRef = ref(rtdb, 'attendance');
        const snapshot = await get(attendanceRef);
        if (snapshot.exists()) {
            const attendanceData = snapshot.val();
            const attendance = Object.keys(attendanceData).map(key => ({
                id: key,
                ...attendanceData[key]
            }));
            return { attendance, total: attendance.length };
        }
        return { attendance: [], total: 0 };
    } catch (error) {
        console.error('Error fetching attendance from RTDB:', error);
        return { attendance: [], total: 0, error: 'Failed to fetch attendance' };
    }
}

export async function createRTDBAttendance(attendanceData: any) {
    try {
        if (!rtdb) return { success: false, error: 'Realtime Database not configured' };
        const attendanceRef = ref(rtdb, 'attendance');
        const newAttendanceRef = push(attendanceRef);
        await set(newAttendanceRef, {
            ...attendanceData,
            timestamp: Date.now(),
        });
        return { id: newAttendanceRef.key, success: true };
    } catch (error) {
        console.error('Error creating attendance in RTDB:', error);
        return { success: false, error: 'Failed to create attendance' };
    }
}

// ============= ADMIN OPERATIONS =============

export async function getFirestoreAdmins() {
    try {
        const adminsRef = collection(db, 'admin');
        const snapshot = await getDocs(adminsRef);
        const admins = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        return { admins, total: admins.length };
    } catch (error) {
        console.error('Error fetching admins:', error);
        return { admins: [], total: 0, error: 'Failed to fetch admins' };
    }
}

export async function createFirestoreAdmin(adminData: any) {
    try {
        const adminRef = collection(db, 'admin');
        const newId = adminData.id || crypto.randomUUID();
        const adminDocRef = doc(db, 'admin', newId);
        await setDoc(adminDocRef, {
            ...adminData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: newId, success: true };
    } catch (error) {
        console.error('Error creating admin:', error);
        return { success: false, error: 'Failed to create admin' };
    }
}

export async function updateFirestoreAdmin(adminId: string, adminData: any) {
    try {
        const adminDocRef = doc(db, 'admin', adminId);
        await updateDoc(adminDocRef, {
            ...adminData,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating admin:', error);
        return { success: false, error: 'Failed to update admin' };
    }
}

export async function deleteFirestoreAdmin(adminId: string) {
    try {
        const adminDocRef = doc(db, 'admin', adminId);
        await deleteDoc(adminDocRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting admin:', error);
        return { success: false, error: 'Failed to delete admin' };
    }
}

// Upsert Admin (Create or Update) - Uses Appwrite ID as Firebase document ID
export async function upsertFirestoreAdmin(adminData: any) {
    try {
        if (!adminData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite ID as the Firebase document ID
        const adminDocId = adminData.appwriteId;
        const adminRef = doc(db, 'admin', adminDocId);
        
        // Check if document exists
        const docSnap = await getDoc(adminRef);

        if (docSnap.exists()) {
            // Update existing admin
            await updateDoc(adminRef, {
                ...adminData,
                updatedAt: Timestamp.now(),
            });
            return { id: adminDocId, firebaseId: adminDocId, success: true, action: 'updated' };
        } else {
            // Create new admin with specific document ID
            await setDoc(adminRef, {
                ...adminData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: adminDocId, firebaseId: adminDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting admin:', error);
        return { success: false, error: 'Failed to upsert admin' };
    }
}

// ============= IEE OPERATIONS =============

export async function getFirestoreIEE() {
    try {
        const ieeRef = collection(db, 'iee');
        const snapshot = await getDocs(ieeRef);
        const iee = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        return { documents: iee, total: iee.length };
    } catch (error) {
        console.error('Error fetching IEE:', error);
        return { documents: [], total: 0, error: 'Failed to fetch IEE' };
    }
}

export async function createFirestoreIEE(data: { mebership_id: string; validity: boolean }) {
    try {
        const ieeRef = collection(db, 'iee');
        const docRef = await addDoc(ieeRef, {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating IEE:', error);
        return { success: false, error: 'Failed to create IEE' };
    }
}

export async function updateFirestoreIEE(id: string, data: Partial<{ mebership_id: string; validity: boolean }>) {
    try {
        const ieeDocRef = doc(db, 'iee', id);
        await updateDoc(ieeDocRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating IEE:', error);
        return { success: false, error: 'Failed to update IEE' };
    }
}

export async function deleteFirestoreIEE(id: string) {
    try {
        const ieeDocRef = doc(db, 'iee', id);
        await deleteDoc(ieeDocRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting IEE:', error);
        return { success: false, error: 'Failed to delete IEE' };
    }
}

// Upsert IEE (Create or Update) - Uses Appwrite ID as Firebase document ID
export async function upsertFirestoreIEE(ieeData: any) {
    try {
        if (!ieeData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite ID as the Firebase document ID
        const ieeDocId = ieeData.appwriteId;
        const ieeRef = doc(db, 'iee', ieeDocId);
        
        // Check if document exists
        const docSnap = await getDoc(ieeRef);

        if (docSnap.exists()) {
            // Update existing IEE record
            await updateDoc(ieeRef, {
                ...ieeData,
                updatedAt: Timestamp.now(),
            });
            return { id: ieeDocId, firebaseId: ieeDocId, success: true, action: 'updated' };
        } else {
            // Create new IEE record with specific document ID
            await setDoc(ieeRef, {
                ...ieeData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: ieeDocId, firebaseId: ieeDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting IEE:', error);
        return { success: false, error: 'Failed to upsert IEE' };
    }
}

// ============= IEI OPERATIONS =============

export async function getFirestoreIEI() {
    try {
        const ieiRef = collection(db, 'iei');
        const snapshot = await getDocs(ieiRef);
        const iei = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));
        return { documents: iei, total: iei.length };
    } catch (error) {
        console.error('Error fetching IEI:', error);
        return { documents: [], total: 0, error: 'Failed to fetch IEI' };
    }
}

export async function createFirestoreIEI(data: { mebership_id: string; validity: boolean }) {
    try {
        const ieiRef = collection(db, 'iei');
        const docRef = await addDoc(ieiRef, {
            ...data,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return { id: docRef.id, success: true };
    } catch (error) {
        console.error('Error creating IEI:', error);
        return { success: false, error: 'Failed to create IEI' };
    }
}

export async function updateFirestoreIEI(id: string, data: Partial<{ mebership_id: string; validity: boolean }>) {
    try {
        const ieiDocRef = doc(db, 'iei', id);
        await updateDoc(ieiDocRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating IEI:', error);
        return { success: false, error: 'Failed to update IEI' };
    }
}

export async function deleteFirestoreIEI(id: string) {
    try {
        const ieiDocRef = doc(db, 'iei', id);
        await deleteDoc(ieiDocRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting IEI:', error);
        return { success: false, error: 'Failed to delete IEI' };
    }
}

// Upsert IEI (Create or Update) - Uses Appwrite ID as Firebase document ID
/** Get all tickets belonging to a specific student (stud_id array contains userId) */
export async function getFirestoreTicketsByUser(userId: string) {
    try {
        const ticketsRef = collection(db, 'tickets');
        const q = query(ticketsRef, where('stud_id', 'array-contains', userId));
        const snapshot = await getDocs(q);
        const tickets = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.()?.toISOString() || null,
            updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || null,
        }));
        return { success: true, tickets };
    } catch (error) {
        console.error('Error fetching tickets by user:', error);
        return { success: false, tickets: [], error: 'Failed to fetch tickets' };
    }
}

/** Get all certificates linked to a specific userId */
export async function getFirestoreCertificatesByUser(userId: string) {
    try {
        const certsRef = collection(db, 'certificates');
        const q = query(certsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const certs = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            uploadedAt: d.data().uploadedAt?.toDate?.()?.toISOString() || null,
        }));
        return { success: true, certs };
    } catch (error) {
        console.error('Error fetching certificates by user:', error);
        return { success: false, certs: [], error: 'Failed to fetch certificates' };
    }
}

export async function upsertFirestoreIEI(ieiData: any) {
    try {
        if (!ieiData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
        }

        // Use Appwrite ID as the Firebase document ID
        const ieiDocId = ieiData.appwriteId;
        const ieiRef = doc(db, 'iei', ieiDocId);
        
        // Check if document exists
        const docSnap = await getDoc(ieiRef);

        if (docSnap.exists()) {
            // Update existing IEI record
            await updateDoc(ieiRef, {
                ...ieiData,
                updatedAt: Timestamp.now(),
            });
            return { id: ieiDocId, firebaseId: ieiDocId, success: true, action: 'updated' };
        } else {
            // Create new IEI record with specific document ID
            await setDoc(ieiRef, {
                ...ieiData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            return { id: ieiDocId, firebaseId: ieiDocId, success: true, action: 'created' };
        }
    } catch (error) {
        console.error('Error upserting IEI:', error);
        return { success: false, error: 'Failed to upsert IEI' };
    }
}