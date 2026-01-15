'use server';

import { createAdminClient, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { revalidatePath } from 'next/cache';

/**
 * Special migration to fix dates where month and day were swapped
 * Example: "Jul 2, 2026" should be "7th February 2026" (07-02-2026)
 */
export async function fixSwappedDates() {
    const { databases } = await createAdminClient();
    const results = {
        total: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        details: [] as { id: string; name: string; original: string; fixed: string }[]
    };

    try {
        console.log('🔄 Starting date swap fix migration...');

        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            [Query.limit(500)]
        );

        results.total = response.documents.length;
        console.log(`📊 Found ${results.total} events to process`);

        for (const event of response.documents) {
            try {
                const originalDate = event.date;
                if (!originalDate) {
                    results.skipped++;
                    continue;
                }

                console.log(`\n📅 Event: ${event.event_name}`);
                console.log(`   Original date string: "${originalDate}"`);

                // Parse the current (wrong) date
                const dateObj = new Date(originalDate);
                
                if (isNaN(dateObj.getTime())) {
                    console.log(`   ⚠️  Could not parse date, skipping`);
                    results.skipped++;
                    continue;
                }

                // Get the current values
                const currentMonth = dateObj.getMonth() + 1;
                const currentDay = dateObj.getDate();
                const year = dateObj.getFullYear();

                console.log(`   Parsed as: Month=${currentMonth}, Day=${currentDay}, Year=${year}`);

                // SMART LOGIC: All events should be in January (01) or February (02)
                // If month is > 2, it's definitely wrong and needs swapping
                let correctDay: number;
                let correctMonth: number;
                let needsSwap = false;

                if (currentMonth > 2) {
                    // Month is wrong (it's showing 05, 06, 07, 08, etc.)
                    // The "month" value is actually the day, and "day" is the month
                    correctDay = currentMonth;
                    correctMonth = currentDay;
                    needsSwap = true;
                    console.log(`   ✓ Month > 2, swapping needed`);
                } else if (currentMonth === 1 || currentMonth === 2) {
                    // Month looks correct (01 or 02)
                    // But let's verify the day isn't suspiciously large
                    if (currentDay > 31) {
                        // Day is impossible, must be swapped
                        correctDay = currentMonth;
                        correctMonth = currentDay;
                        needsSwap = true;
                        console.log(`   ✓ Day > 31, swapping needed`);
                    } else {
                        // Looks already correct
                        correctDay = currentDay;
                        correctMonth = currentMonth;
                        console.log(`   ✓ Already correct (month is 01 or 02)`);
                    }
                } else {
                    // Month is 0 or negative - invalid
                    console.log(`   ⚠️  Invalid month value: ${currentMonth}`);
                    results.skipped++;
                    continue;
                }

                console.log(`   Final: Day=${correctDay}, Month=${correctMonth}, Year=${year}`);

                // Validate the corrected values
                if (correctMonth < 1 || correctMonth > 12 || correctDay < 1 || correctDay > 31) {
                    console.log(`   ⚠️  Invalid values (Month=${correctMonth}, Day=${correctDay}), skipping`);
                    results.skipped++;
                    continue;
                }

                // Additional validation: Month should be 01 or 02
                if (correctMonth !== 1 && correctMonth !== 2) {
                    console.log(`   ⚠️  Warning: Month is ${correctMonth}, expected 01 or 02`);
                }

                // Format as dd-mm-yyyy
                const correctDate = `${String(correctDay).padStart(2, '0')}-${String(correctMonth).padStart(2, '0')}-${year}`;
                
                console.log(`   Corrected date: "${correctDate}"`);

                // Check if already correct
                if (originalDate === correctDate) {
                    console.log(`   ⏭️  Already correct, skipping`);
                    results.skipped++;
                    continue;
                }

                // Update in database
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.collections.events,
                    event.$id,
                    { date: correctDate }
                );

                results.updated++;
                results.details.push({
                    id: event.$id,
                    name: event.event_name,
                    original: originalDate,
                    fixed: correctDate
                });

                console.log(`   ✅ Updated successfully`);

            } catch (error) {
                const errorMsg = `Failed to process event ${event.event_name}: ${error}`;
                results.errors.push(errorMsg);
                console.error(`   ❌ ${errorMsg}`);
            }
        }

        console.log('\n✨ Date swap fix completed!');
        console.log(`📊 Total events: ${results.total}`);
        console.log(`✅ Updated: ${results.updated}`);
        console.log(`⏭️  Skipped: ${results.skipped}`);
        console.log(`❌ Errors: ${results.errors.length}`);

        revalidatePath('/dashboard/events');

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

// Preview what will change
export async function previewSwappedDatesFix() {
    const { databases } = await createAdminClient();
    const preview = {
        total: 0,
        willUpdate: 0,
        willSkip: 0,
        changes: [] as { id: string; name: string; original: string; fixed: string }[]
    };

    try {
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.events,
            [Query.limit(500)]
        );

        preview.total = response.documents.length;

        for (const event of response.documents) {
            const originalDate = event.date;
            if (!originalDate) {
                preview.willSkip++;
                continue;
            }

            const dateObj = new Date(originalDate);
            if (isNaN(dateObj.getTime())) {
                preview.willSkip++;
                continue;
            }

            const currentMonth = dateObj.getMonth() + 1;
            const currentDay = dateObj.getDate();
            const year = dateObj.getFullYear();

            let correctDay: number;
            let correctMonth: number;

            if (currentMonth > 2) {
                // Needs swapping
                correctDay = currentMonth;
                correctMonth = currentDay;
            } else if (currentMonth === 1 || currentMonth === 2) {
                if (currentDay > 31) {
                    // Needs swapping
                    correctDay = currentMonth;
                    correctMonth = currentDay;
                } else {
                    // Already correct
                    correctDay = currentDay;
                    correctMonth = currentMonth;
                }
            } else {
                preview.willSkip++;
                continue;
            }

            if (correctMonth < 1 || correctMonth > 12 || correctDay < 1 || correctDay > 31) {
                preview.willSkip++;
                continue;
            }

            const correctDate = `${String(correctDay).padStart(2, '0')}-${String(correctMonth).padStart(2, '0')}-${year}`;

            // Skip if already correct
            if (originalDate === correctDate) {
                preview.willSkip++;
                continue;
            }

            preview.willUpdate++;
            preview.changes.push({
                id: event.$id,
                name: event.event_name,
                original: originalDate,
                fixed: correctDate
            });
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
