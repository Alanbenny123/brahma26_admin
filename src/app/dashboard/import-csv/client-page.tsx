'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { importCSVBatch, getCSVRowCount, addCombinedEntry, bulkUploadBatch, getBulkUploadRowCount } from '@/actions/import-csv';
import { Send, Upload } from 'lucide-react';

interface ClientImportCSVPageProps {
    eventNames?: string[];
    festOptions?: string[];
}

interface BatchResult {
    ticketsCreated: number;
    ticketsUpdated: number;
    transactionsCreated: number;
    transactionsSkipped: number;
    usersUpdated: number;
    errors: string[];
}

export default function ClientImportCSVPage({ eventNames = [], festOptions = ['BRAHMA', 'ASHWAMEDHA'] }: ClientImportCSVPageProps) {
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [addEntryStatus, setAddEntryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [addEntryMsg, setAddEntryMsg] = useState('');
    const [addForm, setAddForm] = useState({
        student_id: '',
        event_name: '',
        fest: '',
        ticket_id: '',
        transaction_id: '',
        payment_id: '',
    });
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

    // Bulk upload (event_id, user_id, fest required; payment_id, transaction_id, ticket_id optional)
    const [bulkCsvContent, setBulkCsvContent] = useState('');
    const [bulkStatus, setBulkStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [bulkCumulative, setBulkCumulative] = useState<BatchResult>({
        ticketsCreated: 0, ticketsUpdated: 0,
        transactionsCreated: 0, transactionsSkipped: 0,
        usersUpdated: 0, errors: [],
    });
    const [bulkErrorLog, setBulkErrorLog] = useState<string[]>([]);
    const bulkAbortRef = useRef(false);

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

    const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setBulkCsvContent(String(reader.result));
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleBulkUpload = async () => {
        const content = bulkCsvContent.trim();
        if (!content) return;
        bulkAbortRef.current = false;
        setBulkStatus('running');
        setBulkErrorLog([]);
        setBulkCumulative({ ticketsCreated: 0, ticketsUpdated: 0, transactionsCreated: 0, transactionsSkipped: 0, usersUpdated: 0, errors: [] });

        const total = await getBulkUploadRowCount(content);
        setBulkProgress({ current: 0, total });

        let offset = 0;
        let done = false;

        while (!done && !bulkAbortRef.current) {
            const { result, nextOffset, done: batchDone, totalRows, errors } = await bulkUploadBatch(content, offset, BATCH_SIZE);

            setBulkCumulative(prev => ({
                ticketsCreated: prev.ticketsCreated + (result.ticketsCreated || 0),
                ticketsUpdated: prev.ticketsUpdated + (result.ticketsUpdated || 0),
                transactionsCreated: prev.transactionsCreated + (result.transactionsCreated || 0),
                transactionsSkipped: prev.transactionsSkipped + (result.transactionsSkipped || 0),
                usersUpdated: prev.usersUpdated + (result.usersUpdated || 0),
                errors: [],
            }));
            if (errors?.length) setBulkErrorLog(prev => [...prev, ...errors]);

            setBulkProgress({ current: nextOffset, total: totalRows });
            offset = nextOffset;
            done = batchDone;
        }

        setBulkStatus(bulkAbortRef.current ? 'idle' : 'done');
    };

    const handleBulkStop = () => {
        bulkAbortRef.current = true;
        setBulkStatus('idle');
    };

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.student_id.trim() || !addForm.event_name.trim() || !addForm.fest.trim()) {
            setAddEntryMsg('Student ID, Event Name, and Fest are required');
            setAddEntryStatus('error');
            return;
        }
        setAddEntryStatus('loading');
        setAddEntryMsg('');
        const result = await addCombinedEntry({
            student_id: addForm.student_id.trim(),
            event_name: addForm.event_name.trim(),
            fest: addForm.fest.trim(),
            ticket_id: addForm.ticket_id.trim() || undefined,
            transaction_id: addForm.transaction_id.trim() || undefined,
            payment_id: addForm.payment_id.trim() || undefined,
        });
        if (result.success) {
            setAddEntryMsg('Entry added successfully!');
            setAddEntryStatus('success');
            setAddForm({ student_id: '', event_name: '', fest: '', ticket_id: '', transaction_id: '', payment_id: '' });
        } else {
            setAddEntryMsg(result.error || 'Failed');
            setAddEntryStatus('error');
        }
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

            {/* Add Single Entry - same style as Issue Ticket */}
            <Card className="glass-card border-cyan-500/30 bg-cyan-500/5">
                <CardHeader>
                    <CardTitle className="text-white/90">Add Entry (Manual)</CardTitle>
                    <p className="text-sm text-white/50 mt-1">Add one record to Firebase — same structure as combined.csv. Empty IDs are auto-generated.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddEntry} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Student ID *</label>
                                <Input
                                    value={addForm.student_id}
                                    onChange={(e) => setAddForm(f => ({ ...f, student_id: e.target.value }))}
                                    placeholder="e.g. brah_28316"
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Event Name *</label>
                                <Input
                                    list="event-name-list"
                                    value={addForm.event_name}
                                    onChange={(e) => setAddForm(f => ({ ...f, event_name: e.target.value }))}
                                    placeholder="Type or select event..."
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                                <datalist id="event-name-list">
                                    {Array.isArray(eventNames) && eventNames.map((name) => (
                                        <option key={name} value={name} />
                                    ))}
                                </datalist>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Fest *</label>
                                <Select
                                    value={addForm.fest}
                                    onChange={(e) => setAddForm(f => ({ ...f, fest: e.target.value }))}
                                    required
                                >
                                    <option value="">Select Fest</option>
                                    {Array.isArray(festOptions) && festOptions.map((fest) => (
                                        <option key={fest} value={fest}>{fest}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Ticket ID (optional)</label>
                                <Input
                                    value={addForm.ticket_id}
                                    onChange={(e) => setAddForm(f => ({ ...f, ticket_id: e.target.value }))}
                                    placeholder="Leave blank to auto-generate"
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Transaction ID (optional)</label>
                                <Input
                                    value={addForm.transaction_id}
                                    onChange={(e) => setAddForm(f => ({ ...f, transaction_id: e.target.value }))}
                                    placeholder="Auto-generated if empty"
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Payment ID (optional)</label>
                                <Input
                                    value={addForm.payment_id}
                                    onChange={(e) => setAddForm(f => ({ ...f, payment_id: e.target.value }))}
                                    placeholder="Auto-generated if empty"
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                        {addEntryMsg && (
                            <p className={`text-sm ${addEntryStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>{addEntryMsg}</p>
                        )}
                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={addEntryStatus === 'loading'}
                                className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-black font-bold"
                            >
                                {addEntryStatus === 'loading' ? 'Adding...' : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Add Entry
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Bulk Upload */}
            <Card className="glass-card border-purple-500/30 bg-purple-500/5">
                <CardHeader>
                    <CardTitle className="text-white/90">Bulk Upload</CardTitle>
                    <p className="text-sm text-white/50 mt-1">
                        Format A: <code className="bg-white/10 px-1 rounded">ticket_id, student_id, event_name, Fest</code> (all required). 
                        Format B: <code className="bg-white/10 px-1 rounded">event_id, user_id, fest</code> + optional payment_id, transaction_id, ticket_id. 
                        student_id/user_id stored in lowercase.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <label className="cursor-pointer">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition">
                                <Upload className="w-4 h-4" />
                                Choose CSV file
                            </span>
                            <input type="file" accept=".csv" onChange={handleBulkFileSelect} className="hidden" />
                        </label>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Or paste CSV (ticket_id, student_id, event_name, Fest)</label>
                        <textarea
                            value={bulkCsvContent}
                            onChange={(e) => setBulkCsvContent(e.target.value)}
                            placeholder={'ticket_id,student_id,event_name,Fest\n698312fb001a4f2f2a6d,brah_62441,Maths Escape Carnival,BRAHMA\n698312fb001a4f2f2a6d,ash_98619,Maths Escape Carnival,BRAHMA'}
                            rows={5}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 font-mono placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                    </div>
                    <div className="flex gap-4 items-center">
                        {bulkStatus === 'done' ? (
                            <>
                                <span className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-medium">
                                    ✓ Done
                                </span>
                                <Button
                                    onClick={handleBulkUpload}
                                    disabled={!bulkCsvContent.trim()}
                                    variant="outline"
                                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                >
                                    Run Again
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={handleBulkUpload}
                                    disabled={bulkStatus === 'running' || !bulkCsvContent.trim()}
                                    className="bg-purple-500 hover:bg-purple-400 text-white font-bold"
                                >
                                    {bulkStatus === 'running' ? 'Uploading...' : 'Start Bulk Upload'}
                                </Button>
                                {bulkStatus === 'running' && (
                                    <Button onClick={handleBulkStop} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                                        Stop
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                    {(bulkStatus === 'running' || bulkStatus === 'done') && bulkProgress.total > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-white/60">
                                <span>{bulkStatus === 'done' ? '✓ Complete' : 'Processing...'}</span>
                                <span>{bulkProgress.current} / {bulkProgress.total} ({Math.round((bulkProgress.current / bulkProgress.total) * 100)}%)</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-purple-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {(bulkStatus === 'running' || bulkStatus === 'done') && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                            <div className="bg-white/5 rounded p-2 text-center">
                                <span className="text-green-400 font-bold">{bulkCumulative.ticketsCreated}</span>
                                <span className="text-white/50 block text-xs">Tickets Created</span>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                                <span className="text-cyan-400 font-bold">{bulkCumulative.ticketsUpdated}</span>
                                <span className="text-white/50 block text-xs">Tickets Updated</span>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                                <span className="text-purple-400 font-bold">{bulkCumulative.transactionsCreated}</span>
                                <span className="text-white/50 block text-xs">Transactions</span>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                                <span className="text-blue-400 font-bold">{bulkCumulative.usersUpdated}</span>
                                <span className="text-white/50 block text-xs">Users Updated</span>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                                <span className="text-red-400 font-bold">{bulkErrorLog.length}</span>
                                <span className="text-white/50 block text-xs">Errors</span>
                            </div>
                        </div>
                    )}
                    {bulkErrorLog.length > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-1">
                            {bulkErrorLog.slice(0, 50).map((e, i) => (
                                <p key={i} className="text-red-300 text-xs font-mono">{e}</p>
                            ))}
                            {bulkErrorLog.length > 50 && <p className="text-red-400 text-xs">...and {bulkErrorLog.length - 50} more</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Controls */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-white/90">Run Import (combined.csv)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center">
                        {status === 'done' ? (
                            <>
                                <span className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 font-medium">
                                    ✓ Done
                                </span>
                                <Button
                                    onClick={handleStart}
                                    variant="outline"
                                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                                >
                                    Run Again
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={handleStart}
                                    disabled={status === 'running'}
                                    className="bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-black font-bold"
                                >
                                    {status === 'running' ? 'Importing...' : 'Start Import'}
                                </Button>
                                {status === 'running' && (
                                    <Button onClick={handleStop} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                                        Stop
                                    </Button>
                                )}
                            </>
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
