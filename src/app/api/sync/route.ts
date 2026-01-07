import { NextRequest, NextResponse } from 'next/server';
import {
    createFirestoreUser,
    updateFirestoreUser,
    deleteFirestoreUser,
    createFirestoreEvent,
    updateFirestoreEvent,
    deleteFirestoreEvent,
    createFirestoreTicket,
    createRTDBAttendance,
} from '@/actions/firebase';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, action, data, id } = body;

        let result;

        // Handle Users
        if (type === 'users') {
            if (action === 'create') {
                result = await createFirestoreUser(data);
            } else if (action === 'update' && id) {
                result = await updateFirestoreUser(id, data);
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreUser(id);
            }
        }
        // Handle Events
        else if (type === 'events') {
            if (action === 'create') {
                result = await createFirestoreEvent(data);
            } else if (action === 'update' && id) {
                result = await updateFirestoreEvent(id, data);
            } else if (action === 'delete' && id) {
                result = await deleteFirestoreEvent(id);
            }
        }
        // Handle Tickets
        else if (type === 'tickets') {
            if (action === 'create') {
                result = await createFirestoreTicket(data);
            }
        }
        // Handle Attendance
        else if (type === 'attendance') {
            if (action === 'create') {
                result = await createRTDBAttendance(data);
            }
        }

        if (result?.success) {
            return NextResponse.json({ success: true, result });
        } else {
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

