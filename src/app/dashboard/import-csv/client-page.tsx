'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { importCSVBatch, getCSVRowCount } from '@/actions/import-csv';

interface BatchResult {
    ticketsCreated: number;
    ticketsUpdated: number;
    transactionsCreated: number;
    transactionsSkipped: number;
    usersUpdated: number;
    errors: string[];
}

export default function ClientImportCSVPage() {
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [cumulative, setCumulative] = useState<BatchResult>({
        ticketsCreated: 0,
        ticketsUpdated: 0,
        transactionsCreated: 0,
        transactionsSkipped: 0,
        usersUpdated: 0,
        errors: [],
    });
    const [errorLog, setErrorLog] = useState<string[]>([]);
    const abortRef = useRef(false);
    const BATCH_SIZE = 100;

    const handleStart = async () => {
        abortRef.current = false;
        setStatus('running');
        setErrorLog([]);
        setCumulative({
            ticketsCreated: 0, ticketsUpdated: 0,
            transactionsCreated: 0, transactionsSkipped: 0,
            usersUpdated: 0, errors: [],
        });

        // Get total first
        const total = await getCSVRowCount();
        setProgress({ current: 0, total });

        let offset = 0;
        let done = false;

        while (!done && !abortRef.current) {
            const { result, nextOffset, done: batchDone, totalRows } = await importCSVBatch(offset, BATCH_SIZE);

            setCumulative(prev => ({
                ticketsCreated: prev.ticketsCreated + (result.ticketsCreated || 0),
                ticketsUpdated: prev.ticketsUpdated + (result.ticketsUpdated || 0),
                transactionsCreated: prev.transactionsCreated + (result.transactionsCreated || 0),
                transactionsSkipped: prev.transactionsSkipped + (result.transactionsSkipped || 0),
                usersUpdated: prev.usersUpdated + (result.usersUpdated || 0),
                errors: [],
            }));

            if (result.errors && result.errors.length > 0) {
                setErrorLog(prev => [...prev, ...result.errors!]);
            }

            setProgress({ current: nextOffset, total: totalRows });
            offset = nextOffset;
            done = batchDone;
        }

        setStatus(abortRef.current ? 'idle' : 'done');
    };

    const handleStop = () => {
        abortRef.current = true;
        setStatus('idle');
    };

    const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="space-y-6 p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-500">
                    Import CSV → Firebase
                </h1>
            </div>

            {/* Info card */}
            <Card className="glass-card border-cyan-500/30 bg-cyan-500/5">
                <CardContent className="p-6">
                    <p className="text-white/80 font-medium mb-2">Imports <code className="bg-white/10 px-2 py-0.5 rounded">combined.csv</code> into Firebase:</p>
                    <ul className="text-white/60 text-sm space-y-1 list-disc list-inside">
                        <li>Creates / updates <strong className="text-white/80">tickets</strong> (grouped by ticket_id)</li>
                        <li>Creates <strong className="text-white/80">transactions</strong> (one per row, skips duplicates)</li>
                        <li>Updates <strong className="text-white/80">user</strong> documents — adds ticket_id to their tickets array</li>
                        <li>Missing <code className="bg-white/10 px-1 rounded">transactions_id</code> / <code className="bg-white/10 px-1 rounded">payment_id</code> → auto-generated random ID</li>
                        <li>Processes {BATCH_SIZE} rows per batch to stay fast</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Controls */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-white/90">Run Import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            onClick={handleStart}
                            disabled={status === 'running'}
                            className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-black font-bold"
                        >
                            {status === 'running' ? 'Importing...' : status === 'done' ? '✓ Done — Run Again' : 'Start Import'}
                        </Button>
                        {status === 'running' && (
                            <Button onClick={handleStop} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                                Stop
                            </Button>
                        )}
                    </div>

                    {/* Progress bar */}
                    {(status === 'running' || status === 'done') && progress.total > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-white/60">
                                <span>{status === 'done' ? '✓ Complete' : 'Processing rows...'}</span>
                                <span>{progress.current} / {progress.total} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-cyan-500 to-green-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {(status === 'running' || status === 'done') && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="glass-card border-green-500/30 bg-green-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-green-400">{cumulative.ticketsCreated}</p>
                            <p className="text-white/50 text-sm mt-1">Tickets Created</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-cyan-500/30 bg-cyan-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-cyan-400">{cumulative.ticketsUpdated}</p>
                            <p className="text-white/50 text-sm mt-1">Tickets Updated</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-purple-500/30 bg-purple-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-purple-400">{cumulative.transactionsCreated}</p>
                            <p className="text-white/50 text-sm mt-1">Transactions Created</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-amber-500/30 bg-amber-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-amber-400">{cumulative.transactionsSkipped}</p>
                            <p className="text-white/50 text-sm mt-1">Transactions Skipped</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-blue-500/30 bg-blue-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-blue-400">{cumulative.usersUpdated}</p>
                            <p className="text-white/50 text-sm mt-1">Users Updated</p>
                        </CardContent>
                    </Card>
                    <Card className="glass-card border-red-500/30 bg-red-500/5">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-red-400">{errorLog.length}</p>
                            <p className="text-white/50 text-sm mt-1">Errors</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error log */}
            {errorLog.length > 0 && (
                <Card className="glass-card border-red-500/30 bg-red-500/5">
                    <CardHeader>
                        <CardTitle className="text-red-400 text-sm">Error Log ({errorLog.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-64 overflow-y-auto space-y-1">
                            {errorLog.slice(0, 200).map((e, i) => (
                                <p key={i} className="text-red-300 text-xs font-mono">{e}</p>
                            ))}
                            {errorLog.length > 200 && (
                                <p className="text-red-400 text-xs">...and {errorLog.length - 200} more</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {status === 'done' && errorLog.length === 0 && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 font-medium">
                    ✓ Import completed successfully with no errors!
                </div>
            )}
        </div>
    );
}
