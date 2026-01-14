import React from 'react';
import { Modal } from "@/components/ui/modal";

interface ChartData {
    label: string;
    value: number;
    color?: string;
}

interface OverviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    metrics: { label: string; value: string | number }[];
    chartData?: ChartData[];
    chartType?: 'bar' | 'pie';
    report?: string;
}

export function OverviewModal({ isOpen, onClose, title, metrics, chartData, chartType = 'bar', report }: OverviewModalProps) {

    const maxVal = chartData ? Math.max(...chartData.map(d => d.value)) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {metrics.map((m, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-lg border border-white/10">
                            <div className="text-sm text-gray-400">{m.label}</div>
                            <div className="text-2xl font-bold text-cyan-400 mt-1">{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Chart Section */}
                {chartData && chartData.length > 0 && (
                    <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                        <h3 className="text-lg font-semibold mb-4 text-gray-200">Visualization</h3>

                        {chartType === 'bar' ? (
                            <div className="flex items-end space-x-4 h-48 pt-4">
                                {chartData.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                        <div
                                            className="w-full bg-cyan-500/50 hover:bg-cyan-400 transition-all rounded-t-sm relative"
                                            style={{ height: `${(d.value / maxVal) * 85}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded text-white whitespace-nowrap z-10">
                                                {d.value}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2 truncate w-full text-center" title={d.label}>{d.label}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="relative w-48 h-48 rounded-full"
                                    style={{
                                        background: `conic-gradient(${chartData.reduce((acc, curr, idx, arr) => {
                                            const total = arr.reduce((s, c) => s + c.value, 0);
                                            const prevEnd = idx === 0 ? 0 : arr.slice(0, idx).reduce((s, c) => s + (c.value / total) * 100, 0);
                                            const end = prevEnd + (curr.value / total) * 100;
                                            return acc + `${curr.color || `hsl(${idx * 60}, 70%, 50%)`} ${prevEnd}% ${end}%, `;
                                        }, '').slice(0, -2)})`
                                    }}
                                >
                                    <div className="absolute inset-4 bg-black rounded-full flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">Distribution</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                                    {chartData.map((d, i) => (
                                        <div key={i} className="flex items-center text-xs text-gray-300">
                                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: d.color || `hsl(${i * 60}, 70%, 50%)` }}></div>
                                            <span className="truncate">{d.label}: {d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Report Section */}
                {report && (
                    <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                        <h3 className="text-lg font-semibold mb-2 text-gray-200">Analysis Report</h3>
                        <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                            {report}
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
