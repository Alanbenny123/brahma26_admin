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

// ============= REALTIME DATABASE OPERATIONS =============

// Users in Realtime Database
export async function getRTDBUsers() {
    try {
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

