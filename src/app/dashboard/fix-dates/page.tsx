'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { fixSwappedDates, previewSwappedDatesFix } from '@/actions/fix-swapped-dates';

export default function FixDatesPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);

    const handlePreview = async () => {
        setIsPreviewing(true);
        setPreview(null);
        try {
            const result = await previewSwappedDatesFix();
            setPreview(result);
        } catch (error) {
            setPreview({ success: false, error: String(error) });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleFix = async () => {
        if (!confirm('⚠️ This will SWAP month and day values for all events!\n\nExample: "Jul 2, 2026" → "07-02-2026" (7th February)\n\nAre you sure?')) {
            return;
        }

        setIsRunning(true);
        setResult(null);
        try {
            const result = await fixSwappedDates();
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
                    <h1 className="text-3xl font-bold text-white/90">Fix Swapped Dates</h1>
                    <p className="text-white/60 mt-2">
                        Fix dates where month and day were swapped during entry
                    </p>
                </div>
            </div>

            {/* Warning Card */}
            <Card className="glass-card border-yellow-500/30 bg-yellow-500/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-500">
                        <AlertTriangle className="w-5 h-5" />
                        Important Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-white/80">
                    <p><strong>Problem:</strong> Dates were entered as dd-mm but interpreted as mm-dd</p>
                    <p><strong>Example:</strong> "Jul 2, 2026" should actually be "7th February 2026"</p>
                    <p><strong>Solution:</strong> This tool swaps month ↔ day values</p>
                    <div className="mt-4 p-3 bg-black/30 rounded">
                        <p className="font-mono text-sm">Jul 2, 2026 (Month=7, Day=2) → 07-02-2026 (Day=7, Month=2)</p>
                        <p className="font-mono text-sm">Aug 2, 2026 (Month=8, Day=2) → 08-02-2026 (Day=8, Month=2)</p>
                        <p className="font-mono text-sm">Jan 22, 2026 (Month=1, Day=22) → 22-01-2026 (Day=22, Month=1)</p>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <Button
                    onClick={handlePreview}
                    disabled={isPreviewing || isRunning}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                    <Eye className="w-4 h-4" />
                    {isPreviewing ? 'Loading...' : 'Preview Changes'}
                </Button>

                <Button
                    onClick={handleFix}
                    disabled={isRunning || isPreviewing}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex items-center gap-2"
                >
                    <Calendar className="w-4 h-4" />
                    {isRunning ? 'Fixing...' : 'Fix Swapped Dates'}
                </Button>
            </div>

            {/* Preview Results */}
            {preview && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white/90">Preview Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {preview.success ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-white/5 rounded">
                                        <p className="text-sm text-white/60">Total Events</p>
                                        <p className="text-2xl font-bold text-white">{preview.total}</p>
                                    </div>
                                    <div className="p-4 bg-green-500/10 rounded">
                                        <p className="text-sm text-green-400">Will Update</p>
                                        <p className="text-2xl font-bold text-green-400">{preview.willUpdate}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded">
                                        <p className="text-sm text-white/60">Will Skip</p>
                                        <p className="text-2xl font-bold text-white">{preview.willSkip}</p>
                                    </div>
                                </div>

                                {preview.changes && preview.changes.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-white/90 mb-3">Changes to be made:</h3>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {preview.changes.map((change: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded text-sm">
                                                    <p className="font-semibold text-white">{change.name}</p>
                                                    <p className="text-white/60">
                                                        <span className="text-red-400">{change.original}</span>
                                                        {' → '}
                                                        <span className="text-green-400">{change.fixed}</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-red-400">Error: {preview.error}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Fix Results */}
            {result && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className={result.success ? 'text-green-400' : 'text-red-400'}>
                            {result.success ? (
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Fix Completed Successfully!
                                </span>
                            ) : (
                                'Fix Failed'
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result.success ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-white/5 rounded">
                                        <p className="text-sm text-white/60">Total Events</p>
                                        <p className="text-2xl font-bold text-white">{result.total}</p>
                                    </div>
                                    <div className="p-4 bg-green-500/10 rounded">
                                        <p className="text-sm text-green-400">Updated</p>
                                        <p className="text-2xl font-bold text-green-400">{result.updated}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded">
                                        <p className="text-sm text-white/60">Skipped</p>
                                        <p className="text-2xl font-bold text-white">{result.skipped}</p>
                                    </div>
                                </div>

                                {result.errors && result.errors.length > 0 && (
                                    <div className="p-4 bg-red-500/10 rounded">
                                        <p className="text-red-400 font-semibold">Errors: {result.errors.length}</p>
                                        <div className="mt-2 space-y-1">
                                            {result.errors.map((error: string, idx: number) => (
                                                <p key={idx} className="text-sm text-red-300">{error}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.details && result.details.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-white/90 mb-3">Updated Events:</h3>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {result.details.map((detail: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded text-sm">
                                                    <p className="font-semibold text-white">{detail.name}</p>
                                                    <p className="text-white/60">
                                                        <span className="text-red-400 line-through">{detail.original}</span>
                                                        {' → '}
                                                        <span className="text-green-400">{detail.fixed}</span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 p-4 bg-green-500/10 rounded border border-green-500/30">
                                    <p className="text-green-400 font-semibold">✅ All dates have been fixed!</p>
                                    <p className="text-white/60 text-sm mt-1">Please refresh your events page to see the updated dates.</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-400">Error: {result.error}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
