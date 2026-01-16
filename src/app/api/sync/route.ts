import { NextRequest, NextResponse } from 'next/server';
import {
    upsertFirestoreUser,
    updateFirestoreUser,
    deleteFirestoreUser,
    upsertFirestoreEvent,
    updateFirestoreEvent,
    deleteFirestoreEvent,
    upsertFirestoreTicket,
    deleteFirestoreTicket,
    upsertFirestoreTransaction,
    updateFirestoreTransaction,
    deleteFirestoreTransaction,
    upsertFirestoreAttendance,
    deleteFirestoreAttendance,
} from '@/actions/firebase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, action, data, id } = body;

        let result;

        // Handle Users (upsert to prevent duplicates)
        if (type === 'users') {
            if (action === 'create') {
                result = await upsertFirestoreUser(data);
            } else if (action === 'update' && id) {
                result = await updateFirestoreUser(id, data);
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreUser(id);
            }
        }
        // Handle Events (upsert to prevent duplicates)
        else if (type === 'events') {
            if (action === 'create') {
                result = await upsertFirestoreEvent(data);
            } else if (action === 'update' && id) {
                result = await updateFirestoreEvent(id, data);
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreEvent(id);
            }
        }
        // Handle Tickets (upsert to prevent duplicates)
        else if (type === 'tickets') {
            if (action === 'create') {
                result = await upsertFirestoreTicket(data);
            } else if (action === 'update' && id) {
                result = await upsertFirestoreTicket({ ...data, appwriteId: id });
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreTicket(id);
            }
        }
        // Handle Transactions (upsert to prevent duplicates)
        else if (type === 'transactions') {
            if (action === 'create') {
                result = await upsertFirestoreTransaction(data);
            } else if (action === 'update' && id) {
                result = await updateFirestoreTransaction(id, data);
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreTransaction(id);
            }
        }
        // Handle Attendance (upsert to prevent duplicates)
        else if (type === 'attendance') {
            if (action === 'create') {
                result = await upsertFirestoreAttendance(data);
            } else if (action === 'update' && id) {
                result = await upsertFirestoreAttendance({ ...data, appwriteId: id });
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreAttendance(id);
            }
        }

        if (result?.success) {
            console.log(`✅ Sync API Success: ${type}/${action}`, (result as any).action || action);
            return NextResponse.json({ success: true, result, action: (result as any).action || action });
        } else {
            console.error(`❌ Sync API Failed: ${type}/${action}`, result?.error);
            return NextResponse.json(
                { success: false, error: result?.error || 'Operation failed' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Sync API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

