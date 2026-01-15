'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Database, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { migrateEventTimesAndDates, previewEventMigration } from '@/actions/migrate-events';

export default function MigrateEventsPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);

    const handlePreview = async () => {
        setIsPreviewing(true);
        setPreview(null);
        try {
            const result = await previewEventMigration();
            setPreview(result);
        } catch (error) {
            setPreview({ success: false, error: String(error) });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleMigrate = async () => {
        if (!confirm('Are you sure you want to migrate all event times and dates? This will update existing events in the database.')) {
            return;
        }

        setIsRunning(true);
        setResult(null);
        try {
            const result = await migrateEventTimesAndDates();
            setResult(result);
        } catch (error) {
            setResult({ success: false, error: String(error) });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white/90">Migrate Event Times & Dates</h1>
                    <p className="text-white/60 mt-2">
                        Normalize all existing event times to 12-hour format (AM/PM) and dates to yyyy-MM-dd format
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Time Format
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-white/60">
                            Converts 24-hour format (14:30) to 12-hour with AM/PM (2:30 PM)
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <Calendar className="w-5 h-5 text-green-500" />
                            Date Format
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-white/60">
                            Normalizes all dates to yyyy-MM-dd format consistently
                        </p>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <Database className="w-5 h-5 text-purple-500" />
                            Safe Migration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-white/60">
                            Preview changes before applying. Only updates events that need normalization
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-white/90">Migration Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            onClick={handlePreview}
                            disabled={isPreviewing || isRunning}
                            variant="outline"
                            className="flex-1"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            {isPreviewing ? 'Previewing...' : 'Preview Changes'}
                        </Button>

                        <Button
                            onClick={handleMigrate}
                            disabled={isRunning || isPreviewing}
                            className="flex-1 bg-green-600 hover:bg-green-500"
                        >
                            <Database className="w-4 h-4 mr-2" />
                            {isRunning ? 'Migrating...' : 'Run Migration'}
                        </Button>
                    </div>

                    <div className="text-sm text-yellow-500 bg-yellow-500/10 p-3 rounded-md border border-yellow-500/20">
                        <strong>⚠️ Important:</strong> Preview changes first to see what will be updated. The migration only affects events with times or dates that need normalization.
                    </div>
                </CardContent>
            </Card>

            {/* Preview Results */}
            {preview && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            <Eye className="w-5 h-5 text-cyan-500" />
                            Preview Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {preview.success ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white/60 text-sm">Total Events</p>
                                        <p className="text-2xl font-bold text-white">{preview.total}</p>
                                    </div>
                                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                                        <p className="text-green-400 text-sm">Will Update</p>
                                        <p className="text-2xl font-bold text-green-400">{preview.willUpdate}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white/60 text-sm">Will Skip</p>
                                        <p className="text-2xl font-bold text-white">{preview.willSkip}</p>
                                    </div>
                                </div>

                                {preview.changes.length > 0 && (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        <h3 className="text-white/90 font-semibold">Changes Preview:</h3>
                                        {preview.changes.map((change: any, idx: number) => (
                                            <div key={idx} className="bg-white/5 p-3 rounded-lg border border-white/10">
                                                <p className="text-white/90 font-medium">{change.name}</p>
                                                <p className="text-xs text-white/40 mb-2">{change.id}</p>
                                                {change.changes.map((c: string, i: number) => (
                                                    <p key={i} className="text-sm text-cyan-400 ml-4">• {c}</p>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-red-400">
                                <AlertCircle className="w-5 h-5 inline mr-2" />
                                Error: {preview.error}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Migration Results */}
            {result && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white/90">
                            {result.success ? (
                                <>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    Migration Completed
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    Migration Failed
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {result.success ? (
                            <>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white/60 text-sm">Total</p>
                                        <p className="text-2xl font-bold text-white">{result.total}</p>
                                    </div>
                                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                                        <p className="text-green-400 text-sm">Updated</p>
                                        <p className="text-2xl font-bold text-green-400">{result.updated}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white/60 text-sm">Skipped</p>
                                        <p className="text-2xl font-bold text-white">{result.skipped}</p>
                                    </div>
                                    <div className={`p-4 rounded-lg ${result.errors.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
                                        <p className={result.errors.length > 0 ? 'text-red-400 text-sm' : 'text-white/60 text-sm'}>Errors</p>
                                        <p className={`text-2xl font-bold ${result.errors.length > 0 ? 'text-red-400' : 'text-white'}`}>{result.errors.length}</p>
                                    </div>
                                </div>

                                {result.details.length > 0 && (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        <h3 className="text-white/90 font-semibold">Updated Events:</h3>
                                        {result.details.map((detail: any, idx: number) => (
                                            <div key={idx} className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                                <p className="text-white/90 font-medium">{detail.name}</p>
                                                <p className="text-xs text-white/40 mb-2">{detail.id}</p>
                                                {detail.changes.map((c: string, i: number) => (
                                                    <p key={i} className="text-sm text-green-400 ml-4">• {c}</p>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {result.errors.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-red-400 font-semibold">Errors:</h3>
                                        {result.errors.map((error: string, idx: number) => (
                                            <p key={idx} className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                                                {error}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-red-400">
                                <AlertCircle className="w-5 h-5 inline mr-2" />
                                Error: {result.error}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
