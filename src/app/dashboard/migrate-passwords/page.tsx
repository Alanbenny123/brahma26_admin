import { migrateAdminPasswords } from "@/actions/migrate-admin-passwords";
import { redirect } from "next/navigation";

/**
 * MIGRATION PAGE - ONE-TIME USE
 * 
 * Visit this page ONCE after deploying bcrypt changes to migrate existing admin passwords.
 * After migration is complete, you can delete this file.
 * 
 * Access at: /dashboard/migrate-passwords
 */

export default async function MigratePasswordsPage() {
    const result = await migrateAdminPasswords();

    if (result.success && result.results) {
        return (
            <div className="container mx-auto p-8 max-w-2xl">
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-green-400 mb-4">
                        ✓ Migration Successful
                    </h1>
                    <div className="space-y-2 text-gray-300">
                        <p><strong>Total admins:</strong> {result.results.total}</p>
                        <p><strong>Migrated:</strong> {result.results.migrated}</p>
                        <p><strong>Skipped (already hashed):</strong> {result.results.skipped}</p>
                        {result.results.errors.length > 0 && (
                            <div className="mt-4">
                                <strong className="text-red-400">Errors:</strong>
                                <ul className="list-disc ml-4">
                                    {result.results.errors.map((err, i) => (
                                        <li key={i} className="text-red-300">{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="mt-6">
                        <a 
                            href="/dashboard/admins" 
                            className="inline-block bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
                        >
                            Go to Admin Management
                        </a>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                        <p>⚠️ You can now delete the migration page file:</p>
                        <code className="text-xs bg-black/50 px-2 py-1 rounded">
                            src/app/dashboard/migrate-passwords/page.tsx
                        </code>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-8 max-w-2xl">
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
                <h1 className="text-2xl font-bold text-red-400 mb-4">
                    ✗ Migration Failed
                </h1>
                <p className="text-gray-300">
                    {result.error || 'Unknown error occurred'}
                </p>
                <div className="mt-4">
                    <a 
                        href="/dashboard/admins" 
                        className="inline-block bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded text-white"
                    >
                        Go to Admin Management
                    </a>
                </div>
            </div>
        </div>
    );
}
