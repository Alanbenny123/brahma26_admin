'use server';

import { createAdminClient, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { formatTime, formatDate } from '@/lib/date-utils';
import { revalidatePath } from 'next/cache';

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
                const normalizedTime = formatTime(originalTime);
                
                if (originalTime !== normalizedTime) {
                    updates.time = normalizedTime;
                    changes.push(`Time: "${originalTime}" → "${normalizedTime}"`);
                }
            }

            // Check and update date
            if (event.date) {
                const originalDate = event.date;
                const normalizedDate = formatDate(originalDate);
                
                console.log(`Event: ${event.event_name}`);
                console.log(`  Original date: "${originalDate}"`);
                console.log(`  Normalized date: "${normalizedDate}"`);
                console.log(`  Will update: ${originalDate !== normalizedDate}`);
                
                if (originalDate !== normalizedDate) {
                    updates.date = normalizedDate;
                    changes.push(`Date: "${originalDate}" → "${normalizedDate}"`);
                }
            }

            // Update if there are changes
            if (Object.keys(updates).length > 0) {
                try {
                    console.log(`🔄 Attempting to update: ${event.event_name}`);
                    console.log(`   Updates:`, JSON.stringify(updates, null, 2));
                    
                    const updated = await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.collections.events,
                        event.$id,
                        updates
                    );
                    
                    console.log(`✅ Successfully updated in Appwrite`);
                    console.log(`   New date value:`, updated.date);
                    
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
                    console.error('Error details:', error);
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

        // Revalidate the events page to show updated data
        revalidatePath('/dashboard/events');
        revalidatePath('/dashboard/migrate-events');

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
                const normalizedTime = formatTime(originalTime);
                if (originalTime !== normalizedTime) {
                    changes.push(`Time: "${originalTime}" → "${normalizedTime}"`);
                }
            }

            if (event.date) {
                const originalDate = event.date;
                const normalizedDate = formatDate(originalDate);
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
