/**
 * EXAMPLE INTEGRATION: Admin Activity Logging
 * ============================================
 * 
 * This file demonstrates how to integrate the admin logging system
 * into various parts of your application.
 */

// ===== EXAMPLE 1: Logging Page Views (Client Component) =====

'use client';

import { useActivityLogger, logAdminAction } from '@/lib/use-activity-logger';
import { useState, useEffect } from 'react';

export function UsersPage() {
    // Automatically logs "Viewed users page" when component mounts
    useActivityLogger();
    
    return <div>Users List</div>;
}

// Custom page view with specific details
export function UserDetailsPage({ userId }: { userId: string }) {
    useActivityLogger({
        action: `Viewed user details: ${userId}`,
        actionType: 'view',
        resource: 'users',
        resourceid: userId,
    });
    
    return <div>User Details</div>;
}


// ===== EXAMPLE 2: Logging CRUD Operations (Server Actions) =====

import { createAdminLog } from '@/actions/admin-logs';
import { createAdminClient, appwriteConfig } from '@/lib/appwrite';
import { ID } from 'node-appwrite';

// Creating a new event
export async function createEvent(eventData: any) {
    const { databases } = await createAdminClient();
    
    try {
        // Perform the create operation
        const newEvent = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            ID.unique(),
            eventData
        );
        
        // Log the action
        await createAdminLog({
            action: `Created event: ${eventData.name}`,
            actionType: 'create',
            resource: 'events',
            resourceid: newEvent.$id,
        });
        
        return { success: true, event: newEvent };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

// Updating an event
export async function updateEvent(eventId: string, updates: any) {
    const { databases } = await createAdminClient();
    
    try {
        const updatedEvent = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            eventId,
            updates
        );
        
        // Log the update
        await createAdminLog({
            action: `Updated event: ${updatedEvent.name} - Changed fields: ${Object.keys(updates).join(', ')}`,
            actionType: 'update',
            resource: 'events',
            resourceid: eventId,
        });
        
        return { success: true, event: updatedEvent };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

// Deleting an event
export async function deleteEvent(eventId: string, eventName: string) {
    const { databases } = await createAdminClient();
    
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            eventId
        );
        
        // Log the deletion
        await createAdminLog({
            action: `Deleted event: ${eventName}`,
            actionType: 'delete',
            resource: 'events',
            resourceid: eventId,
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}


// ===== EXAMPLE 3: Logging from Client Components with Button Clicks =====

'use client';

// import { logAdminAction } from '@/lib/use-activity-logger'; // Already imported above
// import { useState } from 'react';

export function VerifyTicketButton({ ticketId }: { ticketId: string }) {
    const [isVerifying, setIsVerifying] = useState(false);
    
    const handleVerify = async () => {
        setIsVerifying(true);
        
        try {
            // Perform verification
            await fetch('/api/verify-ticket', {
                method: 'POST',
                body: JSON.stringify({ ticketId }),
            });
            
            // Log the action
            await logAdminAction({
                action: 'Verified ticket - Status changed to verified',
                actionType: 'update',
                resource: 'tickets',
                resourceid: ticketId,
            });
        } finally {
            setIsVerifying(false);
        }
    };
    
    return (
        <button onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? 'Verifying...' : 'Verify Ticket'}
        </button>
    );
}


// ===== EXAMPLE 4: Logging Bulk Operations =====

export async function bulkDeleteUsers(userIds: string[]) {
    const { databases } = await createAdminClient();
    
    const results = [];
    for (const userId of userIds) {
        try {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.collections.users,
                userId
            );
            results.push({ userId, success: true });
        } catch (error) {
            results.push({ userId, success: false, error: String(error) });
        }
    }
    
    // Log the bulk operation
    const successCount = results.filter(r => r.success).length;
    await createAdminLog({
        action: `Bulk deleted ${successCount} out of ${userIds.length} users`,
        actionType: 'delete',
        resource: 'users',
    });
    
    return results;
}


// ===== EXAMPLE 5: Logging Data Sync Operations =====

export async function syncDataToFirebase() {
    try {
        // Perform sync
        await fetch('/api/sync', { method: 'POST' });
        
        // Log the sync
        await createAdminLog({
            action: 'Triggered manual data sync - Appwrite to Firebase',
            actionType: 'sync',
            resource: 'firebase',
        });
        
        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}


// ===== EXAMPLE 6: Logging File Uploads =====

export async function uploadEventPoster(eventId: string, file: File) {
    try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);
        
        const response = await fetch('/api/upload-poster', {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        
        // Log the upload
        await logAdminAction({
            action: `Uploaded event poster: ${file.name} (${file.size} bytes)`,
            actionType: 'create',
            resource: 'event-posters',
            resourceid: eventId,
        });
        
        return result;
    } catch (error) {
        return { success: false, error: String(error) };
    }
}


// ===== EXAMPLE 7: Logging with Error Handling =====

export async function safeLoggedOperation(operation: () => Promise<any>, logParams: {
    action: string;
    actionType: 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sync' | 'other';
    resource?: string;
    resourceid?: string;
}) {
    try {
        const result = await operation();
        
        // Log success
        await createAdminLog({
            ...logParams,
            action: `${logParams.action} - Completed successfully`,
        });
        
        return { success: true, data: result };
    } catch (error) {
        // Log failure
        await createAdminLog({
            ...logParams,
            action: `${logParams.action} - Failed: ${error}`,
        });
        
        return { success: false, error: String(error) };
    }
}

// Usage:
// await safeLoggedOperation(
//     () => updateEvent(eventId, updates),
//     { action: 'Update event', actionType: 'update', resource: 'events', resourceid: eventId }
// );


// ===== EXAMPLE 8: Conditional Logging =====

export async function updateUserRole(userId: string, newRole: string, currentRole: string) {
    const { databases } = await createAdminClient();
    
    await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.collections.users,
        userId,
        { role: newRole }
    );
    
    // Only log if it's a significant role change
    if (currentRole !== newRole && (newRole === 'admin' || currentRole === 'admin')) {
        await createAdminLog({
            action: `Changed user role from ${currentRole} to ${newRole} - Critical security change`,
            actionType: 'update',
            resource: 'users',
            resourceid: userId,
        });
    }
}


// ===== EXAMPLE 9: Logging with Additional Context =====

export async function exportUserData(format: 'csv' | 'json') {
    try {
        // Perform export
        const response = await fetch(`/api/export-users?format=${format}`);
        const data = await response.blob();
        
        // Log with context
        await createAdminLog({
            action: `Exported user data - Format: ${format}, Size: ${data.size} bytes`,
            actionType: 'view',
            resource: 'users',
        });
        
        return data;
    } catch (error) {
        return null;
    }
}


// ===== EXAMPLE 10: Using Logging in Custom Hooks =====

'use client';

// import { useEffect } from 'react';
// import { logAdminAction } from '@/lib/use-activity-logger'; // Already imported above

export function useLogOnMount(action: string) {
    useEffect(() => {
        logAdminAction({
            action,
            actionType: 'view',
        });
    }, []); // Only log once on mount
}

// Usage in a component:
// useLogOnMount('Viewed analytics dashboard - Accessed sensitive data visualizations');
