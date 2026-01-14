'use client';

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Search, Trash2, Edit, Filter, Download } from "lucide-react";

interface DataTableProps<T> {
    data: T[];
    columns: { key: keyof T; label: string; sortable?: boolean; multiline?: boolean }[];
    onEdit: (item: T) => void;
    onDelete: (item: T) => void;
    onDeleteMany?: (items: T[]) => void;
    searchKeys: (keyof T)[];
    filterKeys?: (keyof T)[];
    placeholder?: string;
    getRowClassName?: (item: T) => string;
    headerColor?: string; // e.g., "text-cyan-400"
}

export function DataTable<T extends { $id: string }>({
    data,
    columns,
    onEdit,
    onDelete,
    onDeleteMany,
    searchKeys,
    filterKeys,
    placeholder,
    getRowClassName,
    headerColor = "text-cyan-400", // Default color
}: DataTableProps<T>) {
    const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = React.useState(false);
    // ... existing state ...

    // ... existing logic ...

    const [sortConfig, setSortConfig] = React.useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [showFilters, setShowFilters] = React.useState(false);
    const [filters, setFilters] = React.useState<Record<string, string>>({});

    const handleSort = (key: keyof T) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedItems(new Set(filteredData.map(item => item.$id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedItems(newSelected);
    };

    const handleExportCSV = () => {
        const header = columns.map(col => col.label).join(',');
        const rows = filteredData.map(item => {
            return columns.map(col => {
                const value = item[col.key];
                // Handle cases where value might contain commas
                const cellValue = Array.isArray(value) ? value.join('; ') : String(value ?? '');
                return `"${cellValue.replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csvContent = [header, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${String(searchKeys[0])}_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteSelected = () => {
        if (onDeleteMany) {
            const itemsToDelete = data.filter(item => selectedItems.has(item.$id));
            onDeleteMany(itemsToDelete);
            setSelectedItems(new Set());
        }
    };

    const filteredData = React.useMemo(() => {
        return data.filter((item) => {
            // Global Search
            const matchesSearch = (() => {
                if (!searchTerm || searchKeys.length === 0) return true;
                return searchKeys.some(key => {
                    const value = item[key];
                    return String(value ?? '').toLowerCase().includes(searchTerm.toLowerCase());
                });
            })();

            // Column Filters
            const matchesFilters = Object.entries(filters).every(([key, filterValue]) => {
                if (!filterValue) return true;
                const itemValue = item[key as keyof T];
                return String(itemValue ?? '').toLowerCase().includes(filterValue.toLowerCase());
            });

            return matchesSearch && matchesFilters;
        });
    }, [data, searchTerm, searchKeys, filters]);

    const sortedData = React.useMemo(() => {
        if (!sortConfig) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    const [expandedCell, setExpandedCell] = React.useState<string | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={placeholder || `Search by ${searchKeys.map(k => String(k)).join(', ')}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 bg-white/5 border-white/10 text-white"
                    />
                </div>
                <div className="flex items-center gap-4">
                    {onDeleteMany && isSelectionMode && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsSelectionMode(false);
                                setSelectedItems(new Set());
                            }}
                            className="mr-2"
                        >
                            Cancel Selection
                        </Button>
                    )}
                    {selectedItems.size > 0 && onDeleteMany && isSelectionMode && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 mr-2"
                        >
                            Delete Selected ({selectedItems.size})
                        </Button>
                    )}

                    <Button
                        variant={showFilters ? "default" : "outline"}
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="gap-2 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Total: {filteredData.length} records
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-white/10 bg-white/5 animate-in fade-in slide-in-from-top-2">
                    {columns
                        .filter(col => !filterKeys || filterKeys.includes(col.key))
                        .map((col) => {
                            const uniqueValues = Array.from(new Set(data.map(item => String(item[col.key] || '')))).filter(Boolean).sort();
                            return (
                                <div key={String(col.key)} className="space-y-1">
                                    <label className="text-xs text-gray-400">{col.label}</label>
                                    <select
                                        value={filters[String(col.key)] || ''}
                                        onChange={(e) => handleFilterChange(String(col.key), e.target.value)}
                                        className="h-8 w-full rounded-md border border-white/10 bg-black/40 text-xs text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                    >
                                        <option value="">All</option>
                                        {uniqueValues.map((val) => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                    <div className="flex items-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({})}
                            className="text-red-400 hover:text-red-300"
                        >
                            Clear All
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border border-white/10 overflow-hidden bg-black/40 backdrop-blur-md">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-white/5">
                            {isSelectionMode && (
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </TableHead>
                            )}
                            {columns.map((col) => (
                                <TableHead key={String(col.key)} className={`font-bold uppercase text-xs ${headerColor}`}>
                                    {col.sortable ? (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort(col.key)}
                                            className={`hover:bg-transparent ${headerColor} hover:opacity-80 pl-0 font-bold uppercase text-xs h-auto py-0 transition-opacity`}
                                        >
                                            {col.label}
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <span>{col.label}</span>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead className={`text-right font-bold uppercase text-xs sticky right-0 bg-black z-20 ${headerColor} shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]`}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.length > 0 ? (
                            sortedData.map((row) => (
                                <TableRow
                                    key={row.$id}
                                    className={`border-white/5 hover:bg-white/5 transition-colors cursor-pointer border-l-4 ${getRowClassName ? getRowClassName(row) : 'border-l-transparent'}`}
                                    onDoubleClick={() => {
                                        if (onDeleteMany && !isSelectionMode) {
                                            setIsSelectionMode(true);
                                        }
                                    }}
                                >
                                    {isSelectionMode && (
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedItems.has(row.$id)}
                                                onChange={(e) => handleSelectOne(row.$id, e.target.checked)}
                                            />
                                        </TableCell>
                                    )}
                                    {columns.map((col) => {
                                        const value = row[col.key];
                                        const cellId = `${row.$id}-${String(col.key)}`;
                                        const isExpanded = expandedCell === cellId;

                                        return (
                                            <TableCell
                                                key={cellId}
                                                className="text-gray-300 cursor-pointer min-w-[100px]"
                                                onClick={() => setExpandedCell(isExpanded ? null : cellId)}
                                            >
                                                <div className={isExpanded ? "whitespace-pre-wrap" : "line-clamp-1"}>
                                                    {col.multiline && (Array.isArray(value) || (typeof value === 'string' && value.includes(','))) ? (
                                                        (Array.isArray(value) ? value : value.split(',')).map((item, index, array) => (
                                                            <div key={index}>
                                                                {String(item).trim()}{index < array.length - 1 ? ',' : ''}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        (Array.isArray(value)) ? value.join(', ') :
                                                            (value === 0 || value === "0") ? "0" : (String(value ?? "-"))
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right space-x-2 sticky right-0 bg-black z-10 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(row)} className="hover:text-blue-400">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => onDelete(row)} className="hover:text-red-400">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + (isSelectionMode ? 2 : 1)} className="h-24 text-center text-muted-foreground">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
