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

// --- Generic Helpers ---

async function getCollectionData(collectionId: string) {
    const { databases } = await createAdminClient();
    try {
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            collectionId,
            [Query.orderDesc('$createdAt'), Query.limit(1000)]
        );
        // Flatten attributes if needed, or just return documents
        return { documents: response.documents, total: response.total };
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

// Helper to check if event already exists
export async function checkEventExists(eventName: string, eventDate: string, excludeId?: string) {
    const { databases } = await createAdminClient();
    try {
        const queries = [
            Query.equal('event_name', eventName),
            Query.equal('date', eventDate)
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

export async function getUsers() {
    return await getCollectionData(appwriteConfig.collections.users);
}

export async function getTickets() {
    return await getCollectionData(appwriteConfig.collections.tickets);
}

export async function getEvents() {
    return await getCollectionData(appwriteConfig.collections.events);
}

export async function getAttendance() {
    return await getCollectionData(appwriteConfig.collections.attendance);
}

export async function getTransactions() {
    return await getCollectionData(appwriteConfig.collections.transactions);
}

// --- Mutations ---

export async function deleteItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions', id: string) {
    const collectionId = appwriteConfig.collections[type];
    const result = await deleteDocument(collectionId, id);
    if (result.success) {
        revalidatePath(`/dashboard/${type}`);
    }
    return result;
}

export async function createItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions', data: any) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
    try {
        // Check for duplicate events before creating
        if (type === 'events' && data.event_name && data.date) {
            const duplicateCheck = await checkEventExists(data.event_name, data.date);
            if (duplicateCheck.exists) {
                return { 
                    success: false, 
                    error: `Event "${data.event_name}" on ${data.date} already exists. Cannot create duplicate events.`,
                    isDuplicate: true
                };
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

export async function createManyItems(type: 'users' | 'tickets' | 'events' | 'attendance', dataList: any[]) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
    try {
        // For events, check for duplicates first
        if (type === 'events') {
            const duplicates: Array<{ event_name: string; date: string; index: number }> = [];
            const validItems: any[] = [];
            
            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                if (data.event_name && data.date) {
                    const duplicateCheck = await checkEventExists(data.event_name, data.date);
                    if (duplicateCheck.exists) {
                        duplicates.push({ 
                            event_name: data.event_name, 
                            date: data.date, 
                            index: i + 1 
                        });
                    } else {
                        validItems.push(data);
                    }
                } else {
                    validItems.push(data);
                }
            }
            
            // If duplicates found, return error with details
            if (duplicates.length > 0) {
                const duplicateList = duplicates.map(d => 
                    `  • Row ${d.index}: "${d.event_name}" on ${d.date}`
                ).join('\n');
                
                return { 
                    success: false, 
                    error: `Found ${duplicates.length} duplicate event(s):\n${duplicateList}\n\nThese events already exist in the database.`,
                    duplicates,
                    validCount: validItems.length,
                    duplicateCount: duplicates.length
                };
            }
        }
        
        const promises = dataList.map(data => {
            const documentId = type === 'events' ? generateEventId(data.fest) : ID.unique();
            return databases.createDocument(
                appwriteConfig.databaseId,
                collectionId,
                documentId,
                data
            );
        });
        await Promise.all(promises);
        revalidatePath(`/dashboard/${type}`);
        return { success: true, created: dataList.length };
    } catch (error) {
        console.error(`Error creating many ${type}:`, error);
        return { success: false, error };
    }
}

export async function updateItem(type: 'users' | 'tickets' | 'events' | 'attendance' | 'transactions', id: string, data: any) {
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
        // Check for duplicate events when updating event name or date
        if (type === 'events' && (cleanData.event_name || cleanData.date)) {
            // Get current event data to fill in missing fields
            const currentDoc = await databases.getDocument(
                appwriteConfig.databaseId,
                collectionId,
                id
            );
            
            const eventName = cleanData.event_name || currentDoc.event_name;
            const eventDate = cleanData.date || currentDoc.date;
            
            if (eventName && eventDate) {
                const duplicateCheck = await checkEventExists(eventName, eventDate, id);
                if (duplicateCheck.exists) {
                    return { 
                        success: false, 
                        error: `Event "${eventName}" on ${eventDate} already exists. Cannot have duplicate events.`,
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

export async function getTicketsWithEvents() {
    const { documents: tickets, total } = await getTickets();
    const { documents: events } = await getEvents();

    const eventsMap = new Map(events.map((event: any) => [event.$id, event]));

    const enrichedTickets = tickets.map((ticket: any) => ({
        ...ticket,
        event_name: eventsMap.get(ticket.event_id)?.event_name || 'Unknown Event',
        fest: eventsMap.get(ticket.event_id)?.fest || 'Unknown Fest',
    }));

    return { tickets: enrichedTickets, total };
}
