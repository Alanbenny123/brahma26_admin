'use server';

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

// --- Mutations ---

export async function deleteItem(type: 'users' | 'tickets' | 'events' | 'attendance', id: string) {
    const collectionId = appwriteConfig.collections[type];
    const result = await deleteDocument(collectionId, id);
    if (result.success) {
        revalidatePath(`/dashboard/${type}`);
    }
    return result;
}

export async function createItem(type: 'users' | 'tickets' | 'events' | 'attendance', data: any) {
    const { databases } = await createAdminClient();
    const collectionId = appwriteConfig.collections[type];
    try {
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
        return { success: true };
    } catch (error) {
        console.error(`Error creating many ${type}:`, error);
        return { success: false, error };
    }
}

export async function updateItem(type: 'users' | 'tickets' | 'events' | 'attendance', id: string, data: any) {
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
