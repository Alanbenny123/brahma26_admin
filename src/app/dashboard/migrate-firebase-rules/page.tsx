'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { migrateFirebaseEventRules } from '@/actions/migrate-firebase-rules';

interface MigrationResult {
    total: number;
    updated: number;
    skipped: number;
    errors: number;
    success: boolean;
    error?: string;
}

export default function MigrateFirebaseRulesPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<MigrationResult | null>(null);

    const handleMigrate = async () => {
        if (!confirm('This will update event_rules formatting in Firebase. Continue?')) {
            return;
        }

        setIsRunning(true);
        setResult(null);

        try {
            const migrationResult = await migrateFirebaseEventRules();
            setResult(migrationResult);
        } catch (error) {
            console.error('Migration error:', error);
            setResult({
                total: 0,
                updated: 0,
                skipped: 0,
                errors: 1,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Migrate Firebase Event Rules</h1>
                <p className="text-gray-400 mt-2">
                    Format event rules to add newlines after periods for better display in Brahma and Ashwamedha apps
                </p>
            </div>

            <Card className="p-6 bg-zinc-900 border-zinc-800">
                <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <h3 className="text-amber-400 font-semibold mb-2">⚠️ What This Does</h3>
                        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                            <li>Reads all events from Firebase Firestore</li>
                            <li>Adds newlines after periods in event_rules field</li>
                            <li>Skips events that are already formatted</li>
                            <li>Updates only the events that need formatting</li>
                        </ul>
                    </div>

                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                        <h3 className="text-cyan-400 font-semibold mb-2">Example Transformation</h3>
                        <div className="text-sm space-y-2">
                            <div>
                                <span className="text-gray-400">Before:</span>
                                <pre className="bg-black/30 p-2 rounded mt-1 text-gray-300">
Rule 1. Rule 2. Rule 3.
                                </pre>
                            </div>
                            <div>
                                <span className="text-green-400">After:</span>
                                <pre className="bg-black/30 p-2 rounded mt-1 text-green-300">
Rule 1.
Rule 2.
Rule 3.
                                </pre>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleMigrate}
                        disabled={isRunning}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                    >
                        {isRunning ? 'Running Migration...' : 'Run Migration'}
                    </Button>
                </div>
            </Card>

            {result && (
                <Card className={`p-6 border-2 ${result.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                    <h3 className={`text-xl font-bold mb-4 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? '✅ Migration Complete!' : '❌ Migration Failed'}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/30 p-3 rounded">
                            <div className="text-gray-400 text-sm">Total Events</div>
                            <div className="text-2xl font-bold text-white">{result.total}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded">
                            <div className="text-gray-400 text-sm">Updated</div>
                            <div className="text-2xl font-bold text-green-400">{result.updated}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded">
                            <div className="text-gray-400 text-sm">Skipped</div>
                            <div className="text-2xl font-bold text-yellow-400">{result.skipped}</div>
                        </div>
                        <div className="bg-black/30 p-3 rounded">
                            <div className="text-gray-400 text-sm">Errors</div>
                            <div className="text-2xl font-bold text-red-400">{result.errors}</div>
                        </div>
                    </div>

                    {result.error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-300">
                            <strong>Error:</strong> {result.error}
                        </div>
                    )}

                    {result.success && result.updated > 0 && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded p-3 text-green-300">
                            Successfully formatted {result.updated} event rule(s)! 
                            The Ashwamedha and Brahma apps will now display rules with proper line breaks.
                        </div>
                    )}

                    {result.success && result.updated === 0 && (
                        <div className="bg-blue-500/20 border border-blue-500/50 rounded p-3 text-blue-300">
                            All events are already formatted correctly. No updates needed!
                        </div>
                    )}
                </Card>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-gray-400">
                <h4 className="font-semibold text-white mb-2">📝 Notes:</h4>
                <ul className="space-y-1 list-disc list-inside">
                    <li>This only updates the Firebase Firestore database</li>
                    <li>Events in Appwrite are not changed</li>
                    <li>Safe to run multiple times (skips already formatted events)</li>
                    <li>Check browser console for detailed logs</li>
                </ul>
            </div>
        </div>
    );
}
