'use client';

import { AlertCircle, Database, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function SetupGuidePage() {
    const [copiedStep, setCopiedStep] = useState<number | null>(null);

    const copyToClipboard = (text: string, stepNumber: number) => {
        navigator.clipboard.writeText(text);
        setCopiedStep(stepNumber);
        setTimeout(() => setCopiedStep(null), 2000);
    };

    const attributes = [
        { name: 'adminId', type: 'String', size: '100', required: true },
        { name: 'adminEmail', type: 'String', size: '255', required: true },
        { name: 'action', type: 'String', size: '500', required: true },
        { name: 'actionType', type: 'Enum', values: 'view, create, update, delete, login, logout, sync, other', required: true },
        { name: 'resource', type: 'String', size: '100', required: false },
        { name: 'resourceId', type: 'String', size: '100', required: false },
        { name: 'details', type: 'String', size: '2000', required: false },
        { name: 'ipAddress', type: 'String', size: '50', required: false },
        { name: 'userAgent', type: 'String', size: '1000', required: false },
        { name: 'timestamp', type: 'DateTime', required: true },
    ];

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Setup Required: Admin Logs Collection
                        </h1>
                        <p className="text-gray-300">
                            The admin activity logging system requires an <code className="px-2 py-1 bg-black/30 rounded text-orange-400">admin_logs</code> collection in your Appwrite database. 
                            Follow the steps below to set it up.
                        </p>
                    </div>
                </div>
            </div>

            {/* Setup Steps */}
            <div className="space-y-6">
                {/* Step 1 */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                            1
                        </div>
                        <h2 className="text-xl font-semibold text-white">Open Appwrite Console</h2>
                    </div>
                    <div className="ml-11 space-y-2">
                        <p className="text-gray-300">
                            Navigate to your Appwrite Console and select your project.
                        </p>
                        <a
                            href={process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            Open Appwrite Console
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                            2
                        </div>
                        <h2 className="text-xl font-semibold text-white">Create Collection</h2>
                    </div>
                    <div className="ml-11 space-y-3">
                        <p className="text-gray-300">
                            Go to <strong className="text-white">Databases → Your Database → Create Collection</strong>
                        </p>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Collection ID:</span>
                                <button
                                    onClick={() => copyToClipboard('admin_logs', 2)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    {copiedStep === 2 ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <code className="text-green-400 font-mono">admin_logs</code>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                            <span className="text-sm text-gray-400 block mb-2">Collection Name:</span>
                            <code className="text-green-400 font-mono">Admin Logs</code>
                        </div>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                            3
                        </div>
                        <h2 className="text-xl font-semibold text-white">Add Attributes</h2>
                    </div>
                    <div className="ml-11 space-y-3">
                        <p className="text-gray-300 mb-4">
                            Add the following attributes to your collection:
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-600">
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold">Attribute</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold">Type</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold">Size/Values</th>
                                        <th className="text-left py-2 px-3 text-gray-400 font-semibold">Required</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attributes.map((attr, idx) => (
                                        <tr key={attr.name} className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}>
                                            <td className="py-2 px-3">
                                                <code className="text-cyan-400">{attr.name}</code>
                                            </td>
                                            <td className="py-2 px-3 text-purple-400">{attr.type}</td>
                                            <td className="py-2 px-3 text-gray-300">
                                                {attr.type === 'Enum' ? (
                                                    <code className="text-xs">{attr.values}</code>
                                                ) : attr.type === 'DateTime' ? (
                                                    <span className="text-gray-500">-</span>
                                                ) : (
                                                    <span>{attr.size}</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-3">
                                                {attr.required ? (
                                                    <span className="text-green-400">✓ Yes</span>
                                                ) : (
                                                    <span className="text-gray-500">No</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Step 4 */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                            4
                        </div>
                        <h2 className="text-xl font-semibold text-white">Set Permissions</h2>
                    </div>
                    <div className="ml-11 space-y-3">
                        <p className="text-gray-300 mb-3">
                            Configure collection permissions in the <strong className="text-white">Settings</strong> tab:
                        </p>
                        <div className="space-y-2">
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-gray-300"><strong className="text-white">Create:</strong> Any (authenticated users)</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <span className="text-gray-300"><strong className="text-white">Read:</strong> Any (or specific admin role)</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center gap-2">
                                    <span className="text-red-400">✗</span>
                                    <span className="text-gray-300"><strong className="text-white">Update:</strong> None (logs are immutable)</span>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center gap-2">
                                    <span className="text-yellow-400">⚠</span>
                                    <span className="text-gray-300"><strong className="text-white">Delete:</strong> Admins only (for maintenance)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 5 (Optional) */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold">
                            5
                        </div>
                        <h2 className="text-xl font-semibold text-white">
                            Add Indexes <span className="text-sm text-gray-400 font-normal">(Optional but Recommended)</span>
                        </h2>
                    </div>
                    <div className="ml-11 space-y-3">
                        <p className="text-gray-300 mb-3">
                            Create indexes for better query performance:
                        </p>
                        <div className="space-y-2">
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <code className="text-cyan-400">adminId</code>
                                        <span className="text-gray-400 ml-2">(ascending)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <code className="text-cyan-400">actionType</code>
                                        <span className="text-gray-400 ml-2">(ascending)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-600">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <code className="text-cyan-400">timestamp</code>
                                        <span className="text-gray-400 ml-2">(descending)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Completion */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Almost Done!
                            </h3>
                            <p className="text-gray-300 mb-4">
                                After creating the collection, refresh this page to start tracking admin activity.
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>

                {/* Additional Resources */}
                <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-600">
                    <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Additional Resources</h3>
                    </div>
                    <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>See <code className="px-2 py-1 bg-black/30 rounded text-cyan-400">ADMIN_LOGGING_SETUP.md</code> for complete documentation</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>Check <code className="px-2 py-1 bg-black/30 rounded text-cyan-400">src/examples/admin-logging-examples.ts</code> for integration examples</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>Use <code className="px-2 py-1 bg-black/30 rounded text-cyan-400">useActivityLogger()</code> hook in your components to start logging</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
