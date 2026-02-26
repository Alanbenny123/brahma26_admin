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
        const student_id = (cols[4] || '').trim();
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

    // Upsert transactions
    for (const row of batch) {
        try {
            const txRef = doc(db, 'transactions', row.transactions_id);
            const snap = await getDoc(txRef);
            if (snap.exists()) {
                result.transactionsSkipped!++;
                continue;
            }
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
        const transaction_id = (data.transaction_id || '').trim() || randomHexId();
        const payment_id = (data.payment_id || '').trim() || `pay_${randomHexId().toUpperCase()}`;
        const ticket_id = (data.ticket_id || '').trim() || randomHexId();

        const ticketRef = doc(db, 'tickets', ticket_id);
        const snap = await getDoc(ticketRef);
        if (snap.exists()) {
            await updateDoc(ticketRef, {
                stud_id: arrayUnion(data.student_id),
                event_name: data.event_name,
                fest: data.fest,
                updatedAt: Timestamp.now(),
            });
        } else {
            await setDoc(ticketRef, {
                event_id: ticket_id,
                event_name: data.event_name,
                fest: data.fest,
                stud_id: [data.student_id],
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
                stud_id: data.student_id,
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

        const userRef = doc(db, 'users', data.student_id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            await updateDoc(userRef, {
                tickets: arrayUnion(ticket_id),
                updatedAt: Timestamp.now(),
            });
        }

        return { success: true };
    } catch (e: any) {
        console.error('addCombinedEntry error:', e);
        return { success: false, error: e.message };
    }
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
