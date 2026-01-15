'use server';

import { createAdminClient, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

// Convert 24-hour time to 12-hour with AM/PM
function convertTo12Hour(time24: string): string {
    if (!time24) return '';
    
    // If already has AM/PM, return as is
    if (time24.includes('AM') || time24.includes('PM')) {
        return time24;
    }
    
    // Parse 24-hour format
    const match = time24.match(/(\d+):(\d+)/);
    if (!match) return time24;
    
    const hours = parseInt(match[1]);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes} ${period}`;
}

// Normalize date to yyyy-MM-dd format
function normalizeDate(dateStr: string): string {
    if (!dateStr) return '';
    
    // If already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Try to parse and convert to yyyy-MM-dd
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
    }
    
    return dateStr;
}

export async function migrateEventTimesAndDates() {
    const { databases } = await createAdminClient();
    const results = {
        total: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        details: [] as { id: string; name: string; changes: string[] }[]
    };

    try {
        console.log('🔄 Starting event time and date migration...');

        // Fetch all events
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            [Query.limit(500)] // Adjust limit as needed
        );

        results.total = response.documents.length;
        console.log(`📊 Found ${results.total} events to process`);

        for (const event of response.documents) {
            const changes: string[] = [];
            const updates: any = {};

            // Check and update time
            if (event.time) {
                const originalTime = event.time;
                const normalizedTime = convertTo12Hour(originalTime);
                
                if (originalTime !== normalizedTime) {
                    updates.time = normalizedTime;
                    changes.push(`Time: "${originalTime}" → "${normalizedTime}"`);
                }
            }

            // Check and update date
            if (event.date) {
                const originalDate = event.date;
                const normalizedDate = normalizeDate(originalDate);
                
                if (originalDate !== normalizedDate) {
                    updates.date = normalizedDate;
                    changes.push(`Date: "${originalDate}" → "${normalizedDate}"`);
                }
            }

            // Update if there are changes
            if (Object.keys(updates).length > 0) {
                try {
                    await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.collections.events,
                        event.$id,
                        updates
                    );
                    
                    results.updated++;
                    results.details.push({
                        id: event.$id,
                        name: event.event_name,
                        changes
                    });
                    
                    console.log(`✅ Updated: ${event.event_name} (${event.$id})`);
                    changes.forEach(change => console.log(`   ${change}`));
                } catch (error) {
                    const errorMsg = `Failed to update event ${event.event_name} (${event.$id}): ${error}`;
                    results.errors.push(errorMsg);
                    console.error(`❌ ${errorMsg}`);
                }
            } else {
                results.skipped++;
                console.log(`⏭️  Skipped: ${event.event_name} (already normalized)`);
            }
        }

        console.log('\n✨ Migration completed!');
        console.log(`📊 Total events: ${results.total}`);
        console.log(`✅ Updated: ${results.updated}`);
        console.log(`⏭️  Skipped: ${results.skipped}`);
        console.log(`❌ Errors: ${results.errors.length}`);

        return {
            success: true,
            ...results
        };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            ...results
        };
    }
}

// Dry run - preview changes without applying them
export async function previewEventMigration() {
    const { databases } = await createAdminClient();
    const preview = {
        total: 0,
        willUpdate: 0,
        willSkip: 0,
        changes: [] as { id: string; name: string; changes: string[] }[]
    };

    try {
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            [Query.limit(500)]
        );

        preview.total = response.documents.length;

        for (const event of response.documents) {
            const changes: string[] = [];

            if (event.time) {
                const originalTime = event.time;
                const normalizedTime = convertTo12Hour(originalTime);
                if (originalTime !== normalizedTime) {
                    changes.push(`Time: "${originalTime}" → "${normalizedTime}"`);
                }
            }

            if (event.date) {
                const originalDate = event.date;
                const normalizedDate = normalizeDate(originalDate);
                if (originalDate !== normalizedDate) {
                    changes.push(`Date: "${originalDate}" → "${normalizedDate}"`);
                }
            }

            if (changes.length > 0) {
                preview.willUpdate++;
                preview.changes.push({
                    id: event.$id,
                    name: event.event_name,
                    changes
                });
            } else {
                preview.willSkip++;
            }
        }

        return {
            success: true,
            ...preview
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
