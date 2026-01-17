'use server';

/**
 * Migration script to format event_rules in Firebase
 * Adds newlines after periods for better display
 */

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Format event rules: Add newline after each period (full stop)
 */
function formatEventRules(rulesText: string | undefined): string {
    if (!rulesText || typeof rulesText !== 'string') return '';
    
    // Replace ". " with ".\n" (period + space becomes period + newline)
    // Also handle cases where period is at end of line without space
    return rulesText
        .replace(/\.\s+/g, '.\n')  // Period followed by spaces
        .replace(/\.(?=[A-Z0-9])/g, '.\n')  // Period followed by capital letter/number
        .trim();
}

export async function migrateFirebaseEventRules() {
    try {
        console.log('🔄 Starting Firebase event rules migration...');
        
        const eventsRef = collection(db, 'events');
        const snapshot = await getDocs(eventsRef);
        
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        for (const docSnap of snapshot.docs) {
            try {
                const eventData = docSnap.data();
                const oldRules = eventData.event_rules;
                
                if (!oldRules || typeof oldRules !== 'string') {
                    skipped++;
                    continue;
                }

                // Check if already formatted (contains newlines)
                if (oldRules.includes('\n')) {
                    console.log(`⏭️  Skipped ${docSnap.id} - already formatted`);
                    skipped++;
                    continue;
                }

                const newRules = formatEventRules(oldRules);
                
                // Only update if formatting changed something
                if (newRules !== oldRules) {
                    const eventDocRef = doc(db, 'events', docSnap.id);
                    await updateDoc(eventDocRef, {
                        event_rules: newRules,
                        updatedAt: new Date()
                    });
                    
                    console.log(`✅ Updated ${docSnap.id}`);
                    console.log(`   Before: ${oldRules.substring(0, 50)}...`);
                    console.log(`   After: ${newRules.substring(0, 50)}...`);
                    updated++;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`❌ Error updating ${docSnap.id}:`, error);
                errors++;
            }
        }

        const summary = {
            total: snapshot.docs.length,
            updated,
            skipped,
            errors,
            success: errors === 0
        };

        console.log('📊 Migration Summary:', summary);
        return summary;
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return {
            total: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
