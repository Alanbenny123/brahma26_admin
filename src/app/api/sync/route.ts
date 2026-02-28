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
} from '@/actions/firebase';

// Optimize: Type definitions for better type safety
interface SyncRequestBody {
    type: 'users' | 'events' | 'tickets' | 'transactions';
    action: 'create' | 'update' | 'delete';
    data?: any;
    id?: string;
}

// Optimize: Operation mapping to reduce code duplication
const operationMap = {
    users: {
        create: upsertFirestoreUser,
        update: updateFirestoreUser,
        delete: deleteFirestoreUser,
    },
    events: {
        create: upsertFirestoreEvent,
        update: updateFirestoreEvent,
        delete: deleteFirestoreEvent,
    },
    tickets: {
        create: upsertFirestoreTicket,
        update: (id: string, data: any) => upsertFirestoreTicket({ ...data, appwriteId: id }),
        delete: deleteFirestoreTicket,
    },
    transactions: {
        create: upsertFirestoreTransaction,
        update: updateFirestoreTransaction,
        delete: deleteFirestoreTransaction,
    },
} as const;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as SyncRequestBody;
        const { type, action, data, id } = body;

        // Optimize: Early validation
        if (!type || !operationMap[type]) {
            return NextResponse.json(
                { success: false, error: `Invalid type: ${type}` },
                { status: 400 }
            );
        }

        if (!action || !['create', 'update', 'delete'].includes(action)) {
            return NextResponse.json(
                { success: false, error: `Invalid action: ${action}` },
                { status: 400 }
            );
        }

        // Optimize: Validate required parameters based on action
        if ((action === 'update' || action === 'delete') && !id) {
            return NextResponse.json(
                { success: false, error: 'ID is required for update/delete operations' },
                { status: 400 }
            );
        }

        if ((action === 'create' || action === 'update') && !data) {
            return NextResponse.json(
                { success: false, error: 'Data is required for create/update operations' },
                { status: 400 }
            );
        }

        // Optimize: Execute operation using the mapping
        const operations = operationMap[type];
        let result;

        if (action === 'create') {
            result = await operations.create(data);
        } else if (action === 'update') {
            result = await operations.update(id!, data);
        } else if (action === 'delete') {
            result = await operations.delete(id!);
        }

        if (result?.success) {
            console.log(`✅ Sync API Success: ${type}/${action}`, (result as any).action || action);
            return NextResponse.json(
                { success: true, result, action: (result as any).action || action },
                {
                    headers: {
                        'Cache-Control': 'no-store, must-revalidate',
                    }
                }
            );
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

