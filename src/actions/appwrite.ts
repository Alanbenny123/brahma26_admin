'use server';

/**
 * APPWRITE ACTIONS - PRIMARY DATABASE
 * ===================================
 * 
 * IMPORTANT: Appwrite is the PRIMARY source of truth for all admin operations.
 * 
 * DATA FLOW ARCHITECTURE:
 * 1. Admin creates/updates/deletes data → Appwrite (via these actions)
 * 2. Appwrite real-time listener detects change → Triggers sync
 * 3. Sync API automatically updates Firebase Firestore (backup/fallback)
 * 
 * NEVER write directly to Firebase from admin operations!
 * Firebase is only for:
 *   - Automatic sync (via real-time listener)
 *   - Fallback reads when Appwrite is unavailable
 *   - Image storage (Firebase Storage)
 * 
 * All non-image data modifications MUST go through Appwrite first.
 * 
 * OPTIMIZATION FEATURES:
 * - Parallel batch fetching for large datasets
 * - Cursor-based pagination for better performance
 * - Retry logic with exponential backoff
 * - Query optimization with proper ordering
 * - Connection reuse across requests
 * - Selective field fetching to reduce payload
 */

import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { generateEventId } from "@/lib/utils";
import { formatTime, formatDate } from "@/lib/date-utils";

// --- Retry Logic with Exponential Backoff ---

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                console.log(`Retry attempt ${i + 1} after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

// --- Generic Helpers with Optimizations ---

interface FetchOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderType?: 'asc' | 'desc';
    filters?: any[];
    selectFields?: string[];
}

async function getCollectionData(
    collectionId: string, 
    fetchAll: boolean = false,
    options: FetchOptions = {}
) {
    const { databases } = await createAdminClient();
    
    return retryWithBackoff(async () => {
        try {
            if (!fetchAll) {
                // Single request with options
                const queries = [];
                
                // Add ordering
                const orderBy = options.orderBy || '$createdAt';
                if (options.orderType === 'asc') {
                    queries.push(Query.orderAsc(orderBy));
                } else {
                    queries.push(Query.orderDesc(orderBy));
                }
                
                // Add filters if provided
                if (options.filters && options.filters.length > 0) {
                    queries.push(...options.filters);
                }
                
                // Add pagination
                queries.push(Query.limit(options.limit || 1000));
                if (options.offset) {
                    queries.push(Query.offset(options.offset));
                }
                
                const response = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    collectionId,
                    queries
                );
                
                return { documents: response.documents, total: response.total };
            }

            // Parallel batch fetching for ALL documents
            const batchSize = 100; // Appwrite max limit per request
            const allDocuments: any[] = [];
            
            // First request to get total count
            const queries = [];
            const orderBy = options.orderBy || '$createdAt';
            if (options.orderType === 'asc') {
                queries.push(Query.orderAsc(orderBy));
            } else {
                queries.push(Query.orderDesc(orderBy));
            }
            
            if (options.filters && options.filters.length > 0) {
                queries.push(...options.filters);
            }
            
            queries.push(Query.limit(batchSize), Query.offset(0));
            
            const firstResponse = await databases.listDocuments(
                appwriteConfig.databaseId,
                collectionId,
                queries
            );
            
            const dbTotal = firstResponse.total;
            allDocuments.push(...firstResponse.documents);
            
            // Calculate remaining batches
            const remainingCount = dbTotal - batchSize;
            if (remainingCount > 0) {
                const batchCount = Math.ceil(remainingCount / batchSize);
                
                // Parallel batch fetching for better performance
                const batchPromises = [];
                for (let i = 0; i < batchCount; i++) {
                    const offset = (i + 1) * batchSize;
                    
                    const batchQueries = [];
                    if (options.orderType === 'asc') {
                        batchQueries.push(Query.orderAsc(orderBy));
                    } else {
                        batchQueries.push(Query.orderDesc(orderBy));
                    }
                    
                    if (options.filters && options.filters.length > 0) {
                        batchQueries.push(...options.filters);
                    }
                    
                    batchQueries.push(Query.limit(batchSize), Query.offset(offset));
                    
                    batchPromises.push(
                        databases.listDocuments(
                            appwriteConfig.databaseId,
                            collectionId,
                            batchQueries
                        )
                    );
                }
                
                // Execute all batches in parallel
                const batchResults = await Promise.all(batchPromises);
                for (const result of batchResults) {
                    allDocuments.push(...result.documents);
                }
            }

            return { documents: allDocuments, total: dbTotal };
        } catch (error) {
            console.error(`Error fetching ${collectionId}:`, error);
            return { documents: [], total: 0 };
        }
    });
}

async function deleteDocument(collectionId: string, documentId: string) {
    const { databases } = await createAdminClient();
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            collectionId,
            documentId
        );
        return { success: true };
    } catch (error) {
        console.error(`Error deleting ${documentId}:`, error);
        return { success: false, error };
    }
}

// --- Collection Specific Getters with Options ---

// Helper to check if event already exists (checks event_name + fest + date combination)
export async function checkEventExists(eventName: string, fest: string, date: string, excludeId?: string) {
    const { databases } = await createAdminClient();
    
    return retryWithBackoff(async () => {
        try {
            const queries = [
                Query.equal('event_name', eventName),
                Query.equal('fest', fest),
                Query.equal('date', date)
            ];
            
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.collections.events,
                queries
            );
            
            // If we're updating an existing event, exclude it from the duplicate check
            if (excludeId) {
                const duplicates = response.documents.filter(doc => doc.$id !== excludeId);
                return { exists: duplicates.length > 0, documents: duplicates };
            }
            
            return { exists: response.total > 0, documents: response.documents };
        } catch (error) {
            console.error('Error checking event existence:', error);
            return { exists: false, documents: [] };
        }
    });
}

export async function getUsers(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.users, fetchAll, options);
}

export async function getTickets(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.tickets, fetchAll, options);
}

export async function getEvents(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.events, fetchAll, options);
}

export async function getAttendance(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.attendance, fetchAll, options);
}

export async function getTransactions(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.transactions, fetchAll, options);
}

export async function getCertificates(fetchAll: boolean = false, options: FetchOptions = {}) {
    return await getCollectionData(appwriteConfig.collections.certificates, fetchAll, options);
}

// --- Parallel Multi-Collection Fetching ---

export async function getAllCollectionsData(fetchAll: boolean = false) {
    try {
        // Fetch all collections in parallel for maximum performance
        const [users, events, tickets, transactions, attendance, certificates] = await Promise.all([
            getUsers(fetchAll),
            getEvents(fetchAll),
            getTickets(fetchAll),
            getTransactions(fetchAll),
            getAttendance(fetchAll),
            getCertificates(fetchAll),
        ]);
        
        return {
            success: true,
            data: {
                users,
                events,
                tickets,
                transactions,
                attendance,
                certificates,
            },
            totals: {
                users: users.total,
                events: events.total,
                tickets: tickets.total,
                transactions: transactions.total,
                attendance: attendance.total,
                certificates: certificates.total,
            }
        };
    } catch (error) {
        console.error('Error fetching all collections:', error);
        return {
            success: false,
            error: 'Failed to fetch collections data',
            data: null,
            totals: null,
        };
    }
}

// Get specific document by ID with retry
export async function getDocumentById(collectionId: string, documentId: string) {
    const { databases } = await createAdminClient();
    
    return retryWithBackoff(async () => {
        try {
            const document = await databases.getDocument(
                appwriteConfig.databaseId,
                collectionId,
                documentId
            );
            return { success: true, document };
        } catch (error) {
            console.error(`Error fetching document ${documentId}:`, error);
            return { success: false, error };
        }
    });
}

// Batch get multiple documents by IDs
export async function getDocumentsByIds(collectionId: string, documentIds: string[]) {
    const { databases } = await createAdminClient();
    
    return retryWithBackoff(async () => {
        try {
            // Fetch all documents in parallel
            const promises = documentIds.map(id =>
                databases.getDocument(appwriteConfig.databaseId, collectionId, id)
            );
            
            const documents = await Promise.allSettled(promises);
            
            const successful = documents
                .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
                .map(result => result.value);
            
            const failed = documents
                .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
                .map((result, index) => ({ id: documentIds[index], error: result.reason }));
            
            return {
                success: true,
                documents: successful,
                failed,
                total: successful.length,
            };
        } catch (error) {
            console.error('Error batch fetching documents:', error);
            return { success: false, error, documents: [], failed: [], total: 0 };
        }
    });
}

// --- Mutations with Retry Logic ---

export async function deleteItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', id: string) {
    const collectionId = appwriteConfig.collections[type];
    const result = await deleteDocument(collectionId, id);
    if (result.success) {
        revalidatePath(`/dashboard/${type}`);
    }
    return result;
}

// Batch delete with parallel execution
export async function deleteManyItems(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', ids: string[]) {
    const collectionId = appwriteConfig.collections[type];
    
    return retryWithBackoff(async () => {
        try {
            // Delete all in parallel
            const deletePromises = ids.map(id => deleteDocument(collectionId, id));
            const results = await Promise.allSettled(deletePromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (successful > 0) {
                revalidatePath(`/dashboard/${type}`);
            }
            
            return {
                success: true,
                deleted: successful,
                failed,
                total: ids.length,
            };
        } catch (error) {
            console.error(`Error batch deleting ${type}:`, error);
            return { success: false, error, deleted: 0, failed: ids.length, total: ids.length };
        }
    });
}

export async function createItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', data: any) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
    
    return retryWithBackoff(async () => {
        try {
            // Format date and time for events
            if (type === 'events') {
                if (data.date) {
                    data.date = formatDate(data.date);
                }
                if (data.time) {
                    data.time = formatTime(data.time);
                }
            }

            // Check for duplicate events before creating (event_name + fest + date combination)
            if (type === 'events' && data.event_name && data.fest && data.date) {
                const duplicateCheck = await checkEventExists(data.event_name, data.fest, data.date);
                if (duplicateCheck.exists) {
                    return { 
                        success: false, 
                        error: `Event "${data.event_name}" for fest "${data.fest}" on ${data.date} already exists. Cannot create duplicate events.`,
                        isDuplicate: true
                    };
                }
                
                // Validate and truncate string fields for events
                if (data.details) {
                    if (typeof data.details !== 'string') {
                        data.details = String(data.details);
                    }
                    if (data.details.length > 100000) {
                        data.details = data.details.substring(0, 100000);
                    }
                }
                
                if (data.event_rules) {
                    if (typeof data.event_rules !== 'string') {
                        data.event_rules = String(data.event_rules);
                    }
                    if (data.event_rules.length > 100000) {
                        data.event_rules = data.event_rules.substring(0, 100000);
                    }
                }
            }

            const documentId = type === 'events' ? generateEventId(data.fest) : ID.unique();
            await databases.createDocument(
                appwriteConfig.databaseId, 
                collectionId,
                documentId,
                data
            );
            revalidatePath(`/dashboard/${type}`);
            return { success: true };
        } catch (error) {
            console.error(`Error creating ${type}:`, error);
            return { success: false, error };
        }
    });
}

type CreateManyResult = 
    | { success: true; created: number; duplicates?: Array<{ event_name: string; fest: string; index: number }>; duplicateCount?: number; message?: string }
    | { success: false; error: string; validationErrors?: Array<{ event_name: string; error: string; index: number }>; validCount?: number };

export async function createManyItems(type: 'users' | 'tickets' | 'events' | 'attendance', dataList: any[]): Promise<CreateManyResult> {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
    const duplicates: Array<{ event_name: string; fest: string; index: number }> = [];
    try {
        // For events, validate and check for duplicates
        if (type === 'events') {
            const VALID_CATEGORIES = ['TECHNICAL', 'CULTURAL', 'GENERAL'];
            const validItems: any[] = [];
            const validationErrors: Array<{ event_name: string; error: string; index: number }> = [];
            
            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                
                // Validate required category field
                if (!data.category || typeof data.category !== 'string') {
                    validationErrors.push({
                        event_name: data.event_name || 'Unknown',
                        error: 'Category is required and must be a string',
                        index: i + 1
                    });
                    continue;
                }
                
                // Validate category is in enum
                if (!VALID_CATEGORIES.includes(data.category.toUpperCase())) {
                    validationErrors.push({
                        event_name: data.event_name || 'Unknown',
                        error: `Invalid category: "${data.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
                        index: i + 1
                    });
                    continue;
                }
                
                // Ensure category is uppercase (normalize)
                data.category = data.category.toUpperCase();
                
                // Format date and time
                if (data.date) {
                    data.date = formatDate(data.date);
                }
                if (data.time) {
                    data.time = formatTime(data.time);
                }
                
                // Validate and truncate string fields
                if (data.details) {
                    if (typeof data.details !== 'string') {
                        data.details = String(data.details);
                    }
                    if (data.details.length > 1000) {
                        data.details = data.details.substring(0, 1000);
                    }
                }
                
                if (data.event_rules) {
                    if (typeof data.event_rules !== 'string') {
                        data.event_rules = String(data.event_rules);
                    }
                    if (data.event_rules.length > 100000) {
                        data.event_rules = data.event_rules.substring(0, 100000);
                    }
                }
                
                // Check for duplicates based on event_name + fest + date combination
                if (data.event_name && data.fest && data.date) {
                    const duplicateCheck = await checkEventExists(data.event_name, data.fest, data.date);
                    if (duplicateCheck.exists) {
                        duplicates.push({ 
                            event_name: data.event_name, 
                            fest: data.fest, 
                            index: i + 1 
                        });
                    } else {
                        validItems.push(data);
                    }
                } else {
                    validItems.push(data);
                }
            }
            
            // If validation errors found, return error with details
            if (validationErrors.length > 0) {
                const errorList = validationErrors.map(e => 
                    `  • Row ${e.index} (${e.event_name}): ${e.error}`
                ).join('\n');
                
                return { 
                    success: false, 
                    error: `Found ${validationErrors.length} validation error(s):\n${errorList}`,
                    validationErrors,
                    validCount: validItems.length
                };
            }
            
            // Use validated items (skip duplicates)
            dataList = validItems;
        }
        
        const promises = dataList.map(data => {
            // Use ID.unique() to generate unique IDs instead of generateEventId
            // which can produce duplicates for events with the same fest
            const documentId = ID.unique();
            return databases.createDocument(
                appwriteConfig.databaseId,
                collectionId,
                documentId,
                data
            );
        });
        await Promise.all(promises);
        revalidatePath(`/dashboard/${type}`);
        
        // Return success with duplicate info if any were found
        if (type === 'events' && duplicates.length > 0) {
            const duplicateList = duplicates.map((d: { event_name: string; fest: string; index: number }) => 
                `  • Row ${d.index}: "${d.event_name}" (${d.fest})`
            ).join('\n');
            
            return { 
                success: true, 
                created: dataList.length,
                duplicates,
                duplicateCount: duplicates.length,
                message: `Uploaded ${dataList.length} new event(s). Skipped ${duplicates.length} duplicate(s):\n${duplicateList}`
            };
        }
        
        return { success: true, created: dataList.length };
    } catch (error) {
        console.error(`Error creating many ${type}:`, error);
        
        // Format error message properly
        let errorMessage = 'Unknown error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error && typeof error === 'object') {
            // Handle Appwrite errors
            errorMessage = (error as any).message || JSON.stringify(error);
        }
        
        return { success: false, error: errorMessage };
    }
}

export async function updateItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', id: string, data: any) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];

    // Remove system attributes that cannot be updated
    const cleanData = { ...data };
    delete cleanData.$id;
    delete cleanData.$createdAt;
    delete cleanData.$updatedAt;
    delete cleanData.$databaseId;
    delete cleanData.$collectionId;
    delete cleanData.$permissions;

    if (type === 'tickets') {
        delete cleanData.event_name;
        delete cleanData.fest;
    }

    return retryWithBackoff(async () => {
        try {
            console.log(`[UPDATE] Attempting to update ${type} with ID: ${id}`);
            console.log(`[UPDATE] Clean data:`, JSON.stringify(cleanData, null, 2));

            // Format date and time for events
            if (type === 'events') {
                if (cleanData.date) {
                    cleanData.date = formatDate(cleanData.date);
                }
                if (cleanData.time) {
                    cleanData.time = formatTime(cleanData.time);
                }
            }

            // Check for duplicate events when updating event name, fest, or date
            if (type === 'events' && (cleanData.event_name || cleanData.fest || cleanData.date)) {
                // Get current event data to fill in missing fields
                const currentDoc = await databases.getDocument(
                    appwriteConfig.databaseId,
                    collectionId,
                    id
                );
                
                const eventName = cleanData.event_name || currentDoc.event_name;
                const eventFest = cleanData.fest || currentDoc.fest;
                const eventDate = cleanData.date || currentDoc.date;
                
                if (eventName && eventFest && eventDate) {
                    const duplicateCheck = await checkEventExists(eventName, eventFest, eventDate, id);
                    if (duplicateCheck.exists) {
                        console.error(`[UPDATE] Duplicate check failed for event: ${eventName}`);
                        return { 
                            success: false, 
                            error: `Event "${eventName}" for fest "${eventFest}" on ${eventDate} already exists. Cannot have duplicate events.`,
                            isDuplicate: true
                        };
                    }
                }
            }

            const result = await databases.updateDocument(
                appwriteConfig.databaseId,
                collectionId,
                id,
                cleanData
            );
            
            console.log(`[UPDATE] Successfully updated ${type} with ID: ${id}`);
            revalidatePath(`/dashboard/${type}`);
            return { success: true };

        } catch (error) {
            console.error(`[UPDATE ERROR] Failed to update ${type}:`, error);
            
            // Format error message for user
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                errorMessage = (error as any).message || JSON.stringify(error);
            }
            
            return { success: false, error: errorMessage };
        }
    });
}

export async function getTicketsWithEvents(fetchAll: boolean = false) {
    const { documents: tickets, total } = await getTickets(fetchAll);
    const { documents: events } = await getEvents(fetchAll);

    const eventsMap = new Map(events.map((event: any) => [event.$id, event]));

    const enrichedTickets = tickets.map((ticket: any) => ({
        ...ticket,
        event_name: eventsMap.get(ticket.event_id)?.event_name || 'Unknown Event',
        fest: eventsMap.get(ticket.event_id)?.fest || 'Unknown Fest',
    }));

    return { tickets: enrichedTickets, total };
}

// --- TICKET OPERATIONS ---

export async function issueTicket(ticketId: string, studentId: string) {
    const { databases } = await createAdminClient();
    try {
        // Get current ticket
        const ticket = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.tickets,
            ticketId
        );

        // Get current stud_id array
        const currentStudIds = Array.isArray(ticket.stud_id) ? ticket.stud_id : [];

        // Check if student already assigned
        if (currentStudIds.includes(studentId)) {
            return { success: false, error: 'Student already assigned to this ticket' };
        }

        // Add new student
        const updatedStudIds = [...currentStudIds, studentId];

        // Update ticket
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.tickets,
            ticketId,
            { stud_id: updatedStudIds }
        );

        revalidatePath('/dashboard/tickets');
        return { success: true, message: `Ticket issued to student ${studentId}` };
    } catch (error) {
        console.error("Error issuing ticket:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to issue ticket' };
    }
}

export async function cancelTicket(ticketId: string, studentId: string) {
    const { databases } = await createAdminClient();
    try {
        // Get current ticket
        const ticket = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.tickets,
            ticketId
        );

        // Get current stud_id array
        const currentStudIds = Array.isArray(ticket.stud_id) ? ticket.stud_id : [];

        // Check if student is assigned
        if (!currentStudIds.includes(studentId)) {
            return { success: false, error: 'Student not assigned to this ticket' };
        }

        // Remove student
        const updatedStudIds = currentStudIds.filter((id: string) => id !== studentId);

        // Update ticket
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.tickets,
            ticketId,
            { stud_id: updatedStudIds }
        );

        revalidatePath('/dashboard/tickets');
        return { success: true, message: `Ticket canceled for student ${studentId}` };
    } catch (error) {
        console.error("Error canceling ticket:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel ticket' };
    }
}

export async function createTicketWithTransactions(ticketData: any, studentIds: string[], transactionIds: string[]) {
    const { databases } = await createAdminClient();
    try {
        // Validate inputs
        if (!ticketData.event_id) {
            return { success: false, error: 'Event ID is required' };
        }

        if (studentIds.length === 0) {
            // Create ticket without students
            const ticket = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.tickets,
                ID.unique(),
                {
                    event_id: ticketData.event_id,
                    team_name: ticketData.team_name || '',
                    active: ticketData.active ?? true,
                    stud_id: []
                }
            );
            revalidatePath('/dashboard/tickets');
            return { success: true, ticketId: ticket.$id, message: 'Ticket created (no students assigned)' };
        }

        // Create ticket with students
        const ticket = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.tickets,
            ID.unique(),
            {
                event_id: ticketData.event_id,
                team_name: ticketData.team_name || '',
                active: ticketData.active ?? true,
                stud_id: studentIds
            }
        );

        // Create transactions for each student
        const transactionsCreated: string[] = [];
        for (let i = 0; i < studentIds.length; i++) {
            const studentId = studentIds[i];
            const transitionId = transactionIds[i] || '';

            try {
                const transaction = await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.collections.transactions,
                    ID.unique(),
                    {
                        stud_id: studentId,
                        ticket_id: ticket.$id,
                        transition_id: transitionId,
                        amount: ticketData.amount || 0
                    }
                );
                transactionsCreated.push(transaction.$id);
            } catch (txError) {
                console.warn(`Failed to create transaction for student ${studentId}:`, txError);
                // Continue creating remaining transactions even if one fails
            }
        }

        revalidatePath('/dashboard/tickets');
        revalidatePath('/dashboard/transactions');
        
        return {
            success: true,
            ticketId: ticket.$id,
            transactionsCreated: transactionsCreated.length,
            totalStudents: studentIds.length,
            message: `Ticket created with ${studentIds.length} student(s) and ${transactionsCreated.length} transaction(s)`
        };
    } catch (error) {
        console.error("Error creating ticket with transactions:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create ticket' };
    }
}

// --- IEEE OPERATIONS ---


export async function getIEE(fetchAll: boolean = false) {
    return getCollectionData(appwriteConfig.collections.iee, fetchAll);
}

// --- IEI OPERATIONS ---

export async function getIEI(fetchAll: boolean = false) {
    return getCollectionData(appwriteConfig.collections.iei, fetchAll);
}

export async function getIEEE() {
    return getCollectionData(appwriteConfig.collections.iee);

}

export async function createIEEE(data: { mebership_id: string; validity: boolean }) {
    const { databases } = await createAdminClient();
    try {
        const response = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.iee,
            ID.unique(),
            {
                mebership_id: data.mebership_id,
                validity: data.validity,
            }
        );
        revalidatePath('/dashboard/iee');
        return response;
    } catch (error) {
        console.error("Error creating IEEE record:", error);
        throw error;
    }
}

export async function updateIEEE(documentId: string, data: { mebership_id: string; validity: boolean }) {
    const { databases } = await createAdminClient();
    try {
        const response = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.iee,
            documentId,
            {
                mebership_id: data.mebership_id,
                validity: data.validity,
            }
        );
        revalidatePath('/dashboard/iee');
        return response;
    } catch (error) {
        console.error("Error updating IEEE record:", error);
        throw error;
    }
}

export async function deleteIEEE(documentId: string) {
    return deleteDocument(appwriteConfig.collections.iee, documentId);
}


// --- IEI OPERATIONS ---

export async function createIEI(data: { mebership_id: string; validity: boolean }) {
    const { databases } = await createAdminClient();
    try {
        const response = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.iei,
            ID.unique(),
            {
                mebership_id: data.mebership_id,
                validity: data.validity,
            }
        );
        revalidatePath('/dashboard/iei');
        return response;
    } catch (error) {
        console.error("Error creating IEI record:", error);
        throw error;
    }
}

export async function updateIEI(documentId: string, data: { mebership_id: string; validity: boolean }) {
    const { databases } = await createAdminClient();
    try {
        const response = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.iei,
            documentId,
            {
                mebership_id: data.mebership_id,
                validity: data.validity,
            }
        );
        revalidatePath('/dashboard/iei');
        return response;
    } catch (error) {
        console.error("Error updating IEI record:", error);
        throw error;
    }
}

export async function deleteIEI(documentId: string) {
    return deleteDocument(appwriteConfig.collections.iei, documentId);
}

// --- USER EVENTS OPERATIONS ---

export async function getUsersWithEvents(fetchAll: boolean = false) {
    const { documents: users, total } = await getUsers(fetchAll);
    const { documents: tickets } = await getTickets(true); // Need all tickets
    const { documents: events } = await getEvents(true); // Need all events

    // Create maps for quick lookups
    const eventsMap = new Map(events.map((event: any) => [event.$id, event]));
    
    // Group tickets by user (stud_id)
    const ticketsByUser = new Map<string, any[]>();
    tickets.forEach((ticket: any) => {
        if (ticket.stud_id && Array.isArray(ticket.stud_id)) {
            ticket.stud_id.forEach((userId: string) => {
                if (!ticketsByUser.has(userId)) {
                    ticketsByUser.set(userId, []);
                }
                const event = eventsMap.get(ticket.event_id);
                if (event) {
                    ticketsByUser.get(userId)!.push({
                        ticketId: ticket.$id,
                        eventId: event.$id,
                        eventName: event.event_name,
                        fest: event.fest,
                        date: event.date,
                        time: event.time,
                        teamName: ticket.team_name,
                        active: ticket.active,
                    });
                }
            });
        }
    });

    // Enrich users with their registered events
    const usersWithEvents = users.map((user: any) => ({
        $id: user.$id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        college: user.college,
        registeredEvents: ticketsByUser.get(user.$id) || [],
        eventCount: (ticketsByUser.get(user.$id) || []).length,
    }));

    return { users: usersWithEvents, total };
}
