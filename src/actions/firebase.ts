'use server';

import { db, rtdb } from '@/lib/firebase';
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
            await setDoc(userRef, {
                ...userData,
                certificates: certificateUrls, // Store URLs only
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
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

// Upsert Event (Create or Update) - Uses Appwrite ID as Firebase document ID
// Note: Event images should be uploaded to Firebase Storage first
// and only the URL should be stored in Firestore
export async function upsertFirestoreEvent(eventData: any) {
    try {
        if (!eventData.appwriteId) {
            return { success: false, error: 'appwriteId is required' };
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
            await setDoc(eventRef, {
                ...eventData,
                imageUrl: imageUrl, // Store image URL
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
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
