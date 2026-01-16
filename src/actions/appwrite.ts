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
 */

import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import { ID, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { generateEventId } from "@/lib/utils";
import { formatTime, formatDate } from "@/lib/date-utils";

// --- Generic Helpers ---

async function getCollectionData(collectionId: string, fetchAll: boolean = false) {
    const { databases } = await createAdminClient();
    try {
        if (!fetchAll) {
            // Default behavior: fetch with limit
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                collectionId,
                [Query.orderDesc('$createdAt'), Query.limit(1000)]
            );
            return { documents: response.documents, total: response.total };
        }

        // Fetch ALL documents using pagination
        const allDocuments: any[] = [];
        let offset = 0;
        const limit = 100; // Appwrite max limit per request
        let hasMore = true;

        while (hasMore) {
            const response = await databases.listDocuments(
                appwriteConfig.databaseId,
                collectionId,
                [Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset)]
            );
            
            allDocuments.push(...response.documents);
            offset += limit;
            hasMore = response.documents.length === limit;
        }

        return { documents: allDocuments, total: allDocuments.length };
    } catch (error) {
        console.error(`Error fetching ${collectionId}:`, error);
        return { documents: [], total: 0 };
    }
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

// --- Collection Specific Getters ---

// Helper to check if event already exists (checks event_name + fest + date combination)
export async function checkEventExists(eventName: string, fest: string, date: string, excludeId?: string) {
    const { databases } = await createAdminClient();
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
}

export async function getUsers(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.users, fetchAll);
}

export async function getTickets(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.tickets, fetchAll);
}

export async function getEvents(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.events, fetchAll);
}

export async function getAttendance(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.attendance, fetchAll);
}

export async function getTransactions(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.transactions, fetchAll);
}

export async function getCertificates(fetchAll: boolean = false) {
    return await getCollectionData(appwriteConfig.collections.certificates, fetchAll);
}

// --- Mutations ---

export async function deleteItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', id: string) {
    const collectionId = appwriteConfig.collections[type];
    const result = await deleteDocument(collectionId, id);
    if (result.success) {
        revalidatePath(`/dashboard/${type}`);
    }
    return result;
}

export async function createItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions' | 'certificates', data: any) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
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

    try {
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
                    return { 
                        success: false, 
                        error: `Event "${eventName}" for fest "${eventFest}" on ${eventDate} already exists. Cannot have duplicate events.`,
                        isDuplicate: true
                    };
                }
            }
        }

        await databases.updateDocument(
            appwriteConfig.databaseId,
            collectionId,
            id,
            cleanData
        );
        revalidatePath(`/dashboard/${type}`);
        return { success: true };

    } catch (error) {
        console.error(`Error updating ${type}:`, error);
        return { success: false, error };
    }
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
