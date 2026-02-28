'use server';

import fs from 'fs';
import path from 'path';
import { db } from '@/lib/firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    Timestamp,
} from 'firebase/firestore';

export interface ImportRow {
    transactions_id: string;
    payment_id: string;
    event_name: string;
    fest: string;
    student_id: string;
    ticket_id: string;
}

export interface ImportResult {
    totalRows: number;
    ticketsCreated: number;
    ticketsUpdated: number;
    transactionsCreated: number;
    transactionsSkipped: number;
    usersUpdated: number;
    errors: string[];
}

function randomHexId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function parseCSV(csvContent: string): ImportRow[] {
    const lines = csvContent.split('\n').filter(l => l.trim());
    // Skip header
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const transactions_id = (cols[0] || '').trim();
        const payment_id = (cols[1] || '').trim();
        const event_name = (cols[2] || '').trim();
        const fest = (cols[3] || '').trim();
        const student_id = (cols[4] || '').trim().toLowerCase();
        const ticket_id = (cols[5] || '').trim();

        if (!student_id && !ticket_id) continue; // skip empty rows

        rows.push({
            transactions_id: transactions_id || randomHexId(),
            payment_id: payment_id || `pay_${randomHexId().toUpperCase()}`,
            event_name,
            fest,
            student_id,
            ticket_id,
        });
    }
    return rows;
}

/** Import from the bundled combined.csv. Call with offset/limit for batch processing. */
export async function importCSVBatch(
    offset: number,
    limit: number = 100
): Promise<{
    result: Partial<ImportResult>;
    nextOffset: number;
    done: boolean;
    totalRows: number;
}> {
    const csvPath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'import-csv', 'combined.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const allRows = parseCSV(content);
    const totalRows = allRows.length;

    const batch = allRows.slice(offset, offset + limit);
    const result: Partial<ImportResult> = {
        totalRows,
        ticketsCreated: 0,
        ticketsUpdated: 0,
        transactionsCreated: 0,
        transactionsSkipped: 0,
        usersUpdated: 0,
        errors: [],
    };

    // Group batch rows by ticket_id
    const ticketMap = new Map<string, ImportRow[]>();
    for (const row of batch) {
        if (!ticketMap.has(row.ticket_id)) ticketMap.set(row.ticket_id, []);
        ticketMap.get(row.ticket_id)!.push(row);
    }

    // Upsert tickets
    for (const [ticketId, rows] of ticketMap.entries()) {
        try {
            const ticketRef = doc(db, 'tickets', ticketId);
            const snap = await getDoc(ticketRef);
            const allStudIds = [...new Set(rows.map(r => r.student_id).filter(Boolean))];
            const firstRow = rows[0];

            if (snap.exists()) {
                // Merge student IDs
                await updateDoc(ticketRef, {
                    stud_id: arrayUnion(...allStudIds),
                    updatedAt: Timestamp.now(),
                });
                result.ticketsUpdated!++;
            } else {
                await setDoc(ticketRef, {
                    event_id: ticketId,
                    event_name: firstRow.event_name,
                    fest: firstRow.fest,
                    stud_id: allStudIds,
                    active: true,
                    team_name: '',
                    appwriteId: ticketId,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                result.ticketsCreated!++;
            }
        } catch (e: any) {
            result.errors!.push(`Ticket ${ticketId}: ${e.message}`);
        }
    }

    // Upsert transactions + raw combined row
    for (const row of batch) {
        try {
            // Transaction document
            const txRef = doc(db, 'transactions', row.transactions_id);
            const snap = await getDoc(txRef);
            if (snap.exists()) {
                result.transactionsSkipped!++;
            } else {
                await setDoc(txRef, {
                    stud_id: row.student_id,
                    ticket_id: row.ticket_id,
                    transition_id: row.payment_id,
                    payment_id: row.payment_id,
                    transactions_id: row.transactions_id,
                    appwriteId: row.transactions_id,
                    event_name: row.event_name,
                    fest: row.fest,
                    amount: 0,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                result.transactionsCreated!++;
            }

            // Raw combined document (one doc per CSV row / logical transaction)
            const combinedRef = doc(db, 'combined', row.transactions_id);
            await setDoc(combinedRef, {
                transactions_id: row.transactions_id,
                payment_id: row.payment_id,
                event_name: row.event_name,
                fest: row.fest,
                student_id: row.student_id,
                ticket_id: row.ticket_id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (e: any) {
            result.errors!.push(`Transaction ${row.transactions_id}: ${e.message}`);
        }
    }

    // Update users — add ticket IDs to their tickets array
    const userTicketMap = new Map<string, Set<string>>();
    for (const row of batch) {
        if (!row.student_id) continue;
        if (!userTicketMap.has(row.student_id)) userTicketMap.set(row.student_id, new Set());
        userTicketMap.get(row.student_id)!.add(row.ticket_id);
    }

    for (const [userId, ticketIds] of userTicketMap.entries()) {
        try {
            const userRef = doc(db, 'users', userId);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                await updateDoc(userRef, {
                    tickets: arrayUnion(...[...ticketIds]),
                    updatedAt: Timestamp.now(),
                });
                result.usersUpdated!++;
            }
            // If user doesn't exist in Firebase yet, skip silently
        } catch (e: any) {
            result.errors!.push(`User ${userId}: ${e.message}`);
        }
    }

    const nextOffset = offset + batch.length;
    return { result, nextOffset, done: nextOffset >= totalRows, totalRows };
}

/** Add a single entry (same structure as CSV import) — for manual form entry */
export async function addCombinedEntry(data: {
    student_id: string;
    event_name: string;
    fest: string;
    ticket_id?: string;
    transaction_id?: string;
    payment_id?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const student_id = (data.student_id || '').trim().toLowerCase();
        const transaction_id = (data.transaction_id || '').trim() || randomHexId();
        const payment_id = (data.payment_id || '').trim() || `pay_${randomHexId().toUpperCase()}`;
        const ticket_id = (data.ticket_id || '').trim() || randomHexId();

        const ticketRef = doc(db, 'tickets', ticket_id);
        const snap = await getDoc(ticketRef);
        if (snap.exists()) {
            await updateDoc(ticketRef, {
                stud_id: arrayUnion(student_id),
                event_name: data.event_name,
                fest: data.fest,
                updatedAt: Timestamp.now(),
            });
        } else {
            await setDoc(ticketRef, {
                event_id: ticket_id,
                event_name: data.event_name,
                fest: data.fest,
                stud_id: [student_id],
                active: true,
                team_name: '',
                appwriteId: ticket_id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        const txRef = doc(db, 'transactions', transaction_id);
        const txSnap = await getDoc(txRef);
        if (!txSnap.exists()) {
            await setDoc(txRef, {
                stud_id: student_id,
                ticket_id,
                transition_id: payment_id,
                payment_id,
                transactions_id: transaction_id,
                appwriteId: transaction_id,
                event_name: data.event_name,
                fest: data.fest,
                amount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        }

        const userRef = doc(db, 'users', student_id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            await updateDoc(userRef, {
                tickets: arrayUnion(ticket_id),
                updatedAt: Timestamp.now(),
            });
        }

        // Also store raw row in `combined` collection
        const combinedRef = doc(db, 'combined', transaction_id);
        await setDoc(combinedRef, {
            transactions_id: transaction_id,
            payment_id,
            event_name: data.event_name,
            fest: data.fest,
            student_id,
            ticket_id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        return { success: true };
    } catch (e: any) {
        console.error('addCombinedEntry error:', e);
        return { success: false, error: e.message };
    }
}

/** Bulk upload format: event_id, user_id, fest (required); payment_id, transaction_id, ticket_id (optional, auto-gen) */
export interface BulkUploadRow {
    event_id: string;
    user_id: string;
    fest: string;
    payment_id?: string;
    transaction_id?: string;
    ticket_id?: string;
}

function parseBulkUploadCSV(csvContent: string): BulkUploadRow[] {
    const lines = csvContent.split('\n').filter(l => l.trim());
    const rows: BulkUploadRow[] = [];
    const header = (lines[0] || '').toLowerCase();
    const hasHeader = header.includes('event_id') || header.includes('user_id');
    const start = hasHeader ? 1 : 0;

    for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => (c || '').trim());
        const event_id = (cols[0] || '').trim();
        const user_id = (cols[1] || '').trim().toLowerCase();
        const fest = (cols[2] || '').trim();
        const payment_id = (cols[3] || '').trim() || undefined;
        const transaction_id = (cols[4] || '').trim() || undefined;
        const ticket_id = (cols[5] || '').trim() || undefined;

        if (!event_id || !user_id || !fest) continue;

        rows.push({ event_id, user_id, fest, payment_id, transaction_id, ticket_id });
    }
    return rows;
}

/** Process a batch of bulk upload rows. Pass csvContent and offset/limit. */
export async function bulkUploadBatch(
    csvContent: string,
    offset: number,
    limit: number = 100
): Promise<{
    result: Partial<ImportResult>;
    nextOffset: number;
    done: boolean;
    totalRows: number;
    errors: string[];
}> {
    const allRows = parseBulkUploadCSV(csvContent);
    const totalRows = allRows.length;
    const batch = allRows.slice(offset, offset + limit);
    const errors: string[] = [];
    const result: Partial<ImportResult> = {
        ticketsCreated: 0,
        ticketsUpdated: 0,
        transactionsCreated: 0,
        transactionsSkipped: 0,
        usersUpdated: 0,
    };

    // Fetch events for event_id -> event_name mapping
    const { getFirestoreEvents } = await import('@/actions/firebase');
    const { events } = await getFirestoreEvents();
    const eventMap = new Map<string, string>();
    for (const e of events || []) {
        const ev = e as { id?: string; event_name?: string };
        if (ev.id && ev.event_name) eventMap.set(ev.id, ev.event_name);
        if (ev.event_name) eventMap.set(ev.event_name, ev.event_name);
    }

    for (const row of batch) {
        try {
            const transaction_id = row.transaction_id || randomHexId();
            const payment_id = row.payment_id || `pay_${randomHexId().toUpperCase()}`;
            const ticket_id = row.ticket_id || randomHexId();
            const event_name = eventMap.get(row.event_id) || row.event_id;

            // Upsert ticket
            const ticketRef = doc(db, 'tickets', ticket_id);
            const ticketSnap = await getDoc(ticketRef);
            if (ticketSnap.exists()) {
                await updateDoc(ticketRef, {
                    stud_id: arrayUnion(row.user_id),
                    event_name,
                    fest: row.fest,
                    updatedAt: Timestamp.now(),
                });
                result.ticketsUpdated!++;
            } else {
                await setDoc(ticketRef, {
                    event_id: row.event_id,
                    event_name,
                    fest: row.fest,
                    stud_id: [row.user_id],
                    active: true,
                    team_name: '',
                    appwriteId: ticket_id,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                result.ticketsCreated!++;
            }

            // Transaction
            const txRef = doc(db, 'transactions', transaction_id);
            const txSnap = await getDoc(txRef);
            if (!txSnap.exists()) {
                await setDoc(txRef, {
                    stud_id: row.user_id,
                    ticket_id,
                    transition_id: payment_id,
                    payment_id,
                    transactions_id: transaction_id,
                    appwriteId: transaction_id,
                    event_name,
                    fest: row.fest,
                    amount: 0,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                result.transactionsCreated!++;
            } else {
                result.transactionsSkipped!++;
            }

            // Combined raw
            const combinedRef = doc(db, 'combined', transaction_id);
            await setDoc(combinedRef, {
                transactions_id: transaction_id,
                payment_id,
                event_name,
                fest: row.fest,
                student_id: row.user_id,
                ticket_id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            // User
            const userRef = doc(db, 'users', row.user_id);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                await updateDoc(userRef, {
                    tickets: arrayUnion(ticket_id),
                    updatedAt: Timestamp.now(),
                });
                result.usersUpdated!++;
            }
        } catch (e: any) {
            errors.push(`Row ${row.user_id}/${row.event_id}: ${e.message}`);
        }
    }

    const nextOffset = offset + batch.length;
    return { result, nextOffset, done: nextOffset >= totalRows, totalRows, errors };
}

/** Get total row count from bulk upload CSV without importing */
export async function getBulkUploadRowCount(csvContent: string): Promise<number> {
    return parseBulkUploadCSV(csvContent).length;
}

/** Get total row count from CSV without importing */
export async function getCSVRowCount(): Promise<number> {
    try {
        const csvPath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'import-csv', 'combined.csv');
        const content = fs.readFileSync(csvPath, 'utf-8');
        return parseCSV(content).length;
    } catch {
        return 0;
    }
}
