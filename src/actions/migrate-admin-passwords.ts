'use server';

/**
 * ADMIN PASSWORD MIGRATION SCRIPT
 * 
 * This script migrates existing plain-text admin passwords to bcrypt hashed passwords.
 * 
 * IMPORTANT: Run this ONCE after deploying the bcrypt authentication changes.
 * After running, all existing admins will need to use their original passwords,
 * which will now be properly hashed.
 * 
 * Usage: Create a temporary page that calls this function, or run via API route.
 */

import { createAdminClient, appwriteConfig } from "@/lib/appwrite";
import bcrypt from "bcryptjs";
import { Query } from "node-appwrite";

export async function migrateAdminPasswords() {
    try {
        const { databases } = await createAdminClient();

        // Get all admin documents
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.collections.admin,
            [Query.limit(1000)]
        );

        const results = {
            total: response.documents.length,
            migrated: 0,
            skipped: 0,
            errors: [] as string[],
        };

        for (const admin of response.documents) {
            try {
                // Check if password is already hashed (bcrypt hashes start with $2a, $2b, or $2y)
                if (admin.pass && admin.pass.startsWith('$2')) {
                    console.log(`Skipping ${admin.email} - already hashed`);
                    results.skipped++;
                    continue;
                }

                // Hash the plain text password
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(admin.pass, salt);

                // Update the document with hashed password
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.collections.admin,
                    admin.$id,
                    { pass: hashedPassword }
                );

                console.log(`✓ Migrated password for ${admin.email}`);
                results.migrated++;
            } catch (error) {
                const errorMsg = `Failed to migrate ${admin.email}: ${error}`;
                console.error(errorMsg);
                results.errors.push(errorMsg);
            }
        }

        console.log('Migration complete:', results);
        return { success: true, results };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: String(error) };
    }
}
