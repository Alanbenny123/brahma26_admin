'use client';

import { DataTable } from "@/components/dashboard/data-table";
import { Modal } from "@/components/ui/modal";
import { OverviewModal } from "@/components/dashboard/overview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useState } from "react";
import { Trash2, Edit, Plus, Calendar, BarChart3, Upload, RefreshCw } from "lucide-react";
import { deleteItem, updateItem, createItem, createManyItems } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import { generateEventPass } from "@/lib/utils";
import { formatTime, formatDate } from "@/lib/date-utils";
import React, { useRef } from "react";
import bcrypt from "bcryptjs";

interface EventType {
    $id: string;
    event_name: string;
    venue?: string;
    time?: string;
    amount: string;
    slots: number;
    members_count: number;
    category: string;
    fest: string;
    event_pass: string;
    date?: string;
    winners?: string[];
    coordinator?: string[];
    completed?: boolean;
    poster?: string;
    event_rules?: string;
    details?: string;
    phone_number?: string;
}

interface ClientEventsPageProps {
    initialData: EventType[];
    total: number;
    tickets: any[]; // Added tickets for revenue calculation
}

// Category options for dropdown
const CATEGORY_OPTIONS = [
    'TECHNICAL',
    'CULTURAL',
    'GENERAL'
];

// Fest options for dropdown
const FEST_OPTIONS = [
    'BRAHMA',
    'ASHWAMEDHA'
];

export default function ClientEventsPage({ initialData, total, tickets }: ClientEventsPageProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<EventType | null>(null);
    const [formData, setFormData] = useState<Partial<EventType>>({});

    // Overview State
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState<{
        metrics: { label: string; value: string | number }[];
        chartData: { label: string; value: number }[];
        report: string;
    }>({ metrics: [], chartData: [], report: '' });

    // Analysis State
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>("");

    const columns: { key: keyof EventType; label: string; sortable?: boolean; multiline?: boolean }[] = [
        { key: "event_name", label: "Event Name", sortable: true },
        { key: "$id", label: "Event ID", sortable: true },
        { key: "venue", label: "Venue", sortable: true },
        { key: "time", label: "Time", sortable: true },
        { key: "amount", label: "Amount", sortable: true },
        { key: "slots", label: "Slots" },
        { key: "members_count", label: "Members Count", sortable: true },
        { key: "category", label: "Category", sortable: true },
        { key: "fest", label: "Fest", sortable: true },
        { key: "event_pass", label: "Event Pass", sortable: true },
        { key: "date", label: "Date", sortable: true },
        { key: "winners", label: "Winners", sortable: true, multiline: true },
        { key: "coordinator", label: "Coordinator", sortable: true, multiline: true },
        { key: "completed", label: "Completed", sortable: true },
        { key: "poster", label: "Poster" },
        { key: "event_rules", label: "Rules", multiline: true },
        { key: "details", label: "Details", multiline: true },
        { key: "phone_number", label: "Phone Number", sortable: true },
    ];

    // Pre-calculate revenue etc for the modal
    const eventStats = React.useMemo(() => {
        if (!selectedEventId) return null;
        const event = initialData.find(e => e.$id === selectedEventId);
        if (!event) return null;

        const eventTickets = tickets.filter(t => t.event_id === event.$id).length;
        const amountStr = String(event.amount || "0");

        // Fix: Use only the FIRST number found in the string for calculation to avoid concatenation
        const firstMatch = amountStr.match(/[0-9.]+/);
        const numericAmount = firstMatch ? parseFloat(firstMatch[0]) : 0;
        const revenue = eventTickets * numericAmount;

        // Smart Formatter: Inject ₹ before numbers in the full descriptive string
        const displayPrice = amountStr.replace(/([0-9.]+)/g, '₹$1');

        return {
            name: event.event_name,
            participants: eventTickets,
            revenue,
            price: numericAmount,
            displayPrice, // The full formatted string
            id: event.$id
        };
    }, [selectedEventId, initialData, tickets]);

    const processedEvents = initialData; // No longer specialized for table

    const handleDeleteClick = (item: any) => {
        setSelectedItem(item);
        setIsDeleteOpen(true);
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setFormData(item);
        setIsEditOpen(true);
    };

    const handleCloseForm = () => {
        setIsEditOpen(false);
        setSelectedItem(null);
        setFormData({});
    };

    const confirmDelete = async () => {
        if (selectedItem) {
            await deleteItem('events', selectedItem.$id);
            setIsDeleteOpen(false);
            setSelectedItem(null);
        }
    };

    // Check if event pass is unique by comparing with existing events
    const isEventPassUnique = (plainPass: string, excludeEventId?: string): boolean => {
        if (!plainPass) return false;
        
        // Hash the plain password to compare with existing hashed passwords
        const salt = bcrypt.genSaltSync(10);
        const hashedPass = bcrypt.hashSync(plainPass, salt);
        
        // Check against all existing events (excluding current event if editing)
        return !initialData.some(event => {
            if (excludeEventId && event.$id === excludeEventId) return false;
            // Compare hashed passwords
            if (event.event_pass && bcrypt.compareSync(plainPass, event.event_pass)) {
                return true;
            }
            return false;
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check uniqueness if this is a new event pass
        const plainPass = formData.event_pass;
        if (plainPass && !plainPass.startsWith('$2')) {
            // Check if password is unique
            if (!isEventPassUnique(plainPass, selectedItem?.$id)) {
                alert('Event pass already exists. Please generate a new one.');
                return;
            }
        }

        // Ensure numbers are numbers and arrays are arrays
        const dataToSave: any = {
            ...formData,
            amount: String(formData.amount || "0"),
            slots: Number(formData.slots),
            category: formData.category ? String(formData.category).toUpperCase() : 'GENERAL',
            winners: processArrayField(formData.winners),
            coordinator: processArrayField(formData.coordinator),
            phone_number: processArrayField(formData.phone_number).map(p => p.replace(/[^0-9]/g, '')).filter(p => p !== "").join(", ")
        };

        // Handle password hashing: Only hash if event_pass is provided and not already hashed
        if (dataToSave.event_pass && !dataToSave.event_pass.startsWith('$2')) {
            const salt = bcrypt.genSaltSync(10);
            dataToSave.event_pass = bcrypt.hashSync(dataToSave.event_pass, salt);
        }

        // Remove empty strings for optional attributes that might have strict validation (like URL)
        if (dataToSave.poster === "" || !isValidUrl(dataToSave.poster)) {
            delete dataToSave.poster;
        }

        if (selectedItem && selectedItem.$id) {
            const result = await updateItem('events', selectedItem.$id, dataToSave);
            if (!result.success) {
                // Show error message to user
                if (result.error) {
                    alert(typeof result.error === 'string' ? result.error : 'Failed to update event. Please try again.');
                }
                return; // Don't close form on error
            }
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({});
        } else {
            const result = await createItem('events', dataToSave);
            if (!result.success) {
                // Show error message to user
                if (result.error) {
                    alert(typeof result.error === 'string' ? result.error : 'Failed to create event. Please try again.');
                }
                return; // Don't close form on error
            }
            setIsEditOpen(false);
            setSelectedItem(null);
            setFormData({});
        }
    };

    const isValidUrl = (url: string | undefined): boolean => {
        if (!url) return false;
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    };

    const formatArrayForInput = (val: any): string => {
        if (Array.isArray(val)) return val.join(', ');
        return val || '';
    };

    const processArrayField = (val: any): string[] => {
        if (Array.isArray(val)) return val.map(v => String(v));
        if (typeof val === 'string' && val.trim() !== '') {
            return val.split(',').map(v => v.trim()).filter(v => v !== '');
        }
        return [];
    };

    // Convert 24-hour time to 12-hour with AM/PM
    const convertTo12Hour = (time24: string): string => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // Convert 12-hour time with AM/PM to 24-hour
    const convertTo24Hour = (time12: string): string => {
        if (!time12 || (!time12.includes('AM') && !time12.includes('PM'))) return time12;
        const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return time12;
        let hours = parseInt(match[1]);
        const minutes = match[2];
        const period = match[3].toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const handleOverview = () => {
        const totalEvents = initialData.length;

        // Accurate Revenue Calculation: Sum of (Tickets Sold per Event * Event Amount)
        const totalRevenue = initialData.reduce((sum, event) => {
            // 1. Get total tickets for this specific event
            const eventTickets = tickets.filter(t => t.event_id === event.$id).length;

            // 2. Extract numeric amount (handles "300 per team", "500/-", etc.)
            const amountStr = String(event.amount || "0");
            const numericAmount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;

            // 3. Revenue for this event
            const eventRevenue = eventTickets * numericAmount;

            return sum + eventRevenue;
        }, 0);

        const avgRevenue = totalEvents > 0 ? (totalRevenue / totalEvents).toFixed(2) : "0";

        // Category Distribution for Bar Chart
        const catMap = new Map<string, number>();
        initialData.forEach(item => {
            const cat = item.category || 'Unknown';
            catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });
        const chartData = Array.from(catMap.entries()).map(([label, value]) => ({ label, value }));

        const report = `
            Overview Report for ${totalEvents} events.
            
            Financials (Based on actual Ticket Sales):
            - Total Revenue Generated: ₹${totalRevenue.toLocaleString()}
            - Average Revenue per Event: ₹${avgRevenue}
            
            Key Insights:
            - The most popular category is "${chartData.sort((a, b) => b.value - a.value)[0]?.label || 'N/A'}" with ${chartData.sort((a, b) => b.value - a.value)[0]?.value || 0} events.
            - Total slots available across all events: ${initialData.reduce((sum, item) => sum + (item.slots || 0), 0)}.
        `;

        setOverviewData({
            metrics: [
                { label: 'Total Events', value: totalEvents },
                { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}` },
                { label: 'Avg Revenue', value: `₹${avgRevenue}` },
            ],
            chartData,
            report
        });
        setIsOverviewOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const parseCsv = (csvText: string) => {
                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentField = "";
                let inQuotes = false;

                for (let i = 0; i < csvText.length; i++) {
                    const char = csvText[i];
                    const nextChar = csvText[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            currentField += '"';
                            i++; // Skip next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === ',' && !inQuotes) {
                        currentRow.push(currentField.trim());
                        currentField = "";
                    } else if ((char === '\r' || char === '\n') && !inQuotes) {
                        if (currentRow.length > 0 || currentField !== "") {
                            currentRow.push(currentField.trim());
                            rows.push(currentRow);
                            currentRow = [];
                            currentField = "";
                        }
                        if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
                    } else {
                        currentField += char;
                    }
                }
                if (currentRow.length > 0 || currentField !== "") {
                    currentRow.push(currentField.trim());
                    rows.push(currentRow);
                }
                return rows;
            };

            const allRows = parseCsv(text);
            if (allRows.length < 2) {
                alert("CSV file is empty or missing headers.");
                return;
            }

            const rawHeaders = allRows[0];
            const allowedKeys = [
                "event_name", "venue", "time", "amount", "slots", "members_count", "category",
                "fest", "event_pass", "date", "winners", "coordinator",
                "completed", "poster", "event_rules", "details", "phone_number"
            ];

            const headers = rawHeaders.map((h, idx) => {
                let normalized = h.toLowerCase().trim().replace(/[:?]/g, '').replace(/\s+/g, '_');
                // Target mappings for the specific CSV format provided
                if (normalized === "event") return "event_name";
                if (normalized === "event_name") return "event_name";
                if (normalized === "which_fest" || normalized === "fest") return "fest";
                if (normalized === "event_description" || normalized === "event_desc") return "details";
                if (normalized === "event_rules_and_regulations" || normalized === "event_rule" || normalized === "rules") return "event_rules";
                if (normalized === "event_date") return "date";
                if (normalized === "event_time") return "time";
                if (normalized === "no_of_slots" || normalized === "no_of_slot" || normalized === "slots") return "slots";
                if (normalized === "event_reg_amount" || normalized === "event_registration_fee" || normalized === "event__reg_amount") return "amount";
                if (normalized === "phone_number_of_coordinator" || normalized === "phone_number" || normalized === "phone_nur") return "phone_number";
                if (normalized === "event_pass" || normalized === "pass") return "event_pass";
                if (normalized === "coordinators" || normalized === "coordinator" || normalized === "coordinat") return "coordinator";
                if (normalized === "category" || normalized === "event_category" || normalized === "category") return "category";
                if (normalized === "members_count" || normalized === "members" || normalized === "count") return "members_count";
                if (normalized === "score") return "score";
                
                console.log(`Header[${idx}]: "${h}" -> normalized: "${normalized}"`);
                return normalized;
            });

            // Help debug: Check if event_name column was actually mapped
            console.log("=== CSV UPLOAD DEBUG ===");
            console.log("Mapped headers:", headers);
            if (!headers.includes("event_name")) {
                alert("Missing required column: 'Event' or 'Event Name' not found in CSV. Please check your headers.");
                console.log("Detected headers (normalized):", headers);
                return;
            }
            console.log("Category column index:", headers.indexOf("category"));
            console.log("=== END DEBUG ===")

            const processedItems = allRows.slice(1)
                .filter(row => row.some(cell => cell.trim() !== "")) // Robustness: Ignore rows that are completely empty
                .map((values, lineIdx) => {
                    const item: any = {};
                    const tempCoordinators: string[] = [];
                    const tempPhones: string[] = [];

                    headers.forEach((header, index) => {
                        let val = values[index] || "";
                        const rawHeader = rawHeaders[index].toLowerCase().trim();

                        if (rawHeader.startsWith("name of coordinator") || rawHeader.startsWith("name of coordintor")) {
                            if (val) {
                                const names = val.split(/[,;]/).map(n => n.trim()).filter(n => n !== "");
                                tempCoordinators.push(...names);
                            }
                            return;
                        }

                        if (rawHeader === "coordinators") {
                            if (val) {
                                const names = val.split(/[,;]/).map(n => n.trim()).filter(n => n !== "");
                                tempCoordinators.push(...names);
                            }
                            return;
                        }

                        if (rawHeader.includes("phone") || rawHeader.includes("contact")) {
                            if (val) {
                                const phones = val.split(/[,;]/)
                                    .map(p => p.trim())
                                    .filter(p => p !== "")
                                    .map(p => p.replace(/[^0-9]/g, ''))
                                    .filter(p => p !== "");
                                tempPhones.push(...phones);
                            }
                            return;
                        }

                        if (!header || !allowedKeys.includes(header)) {
                            // Skip unmapped headers but log them for debugging
                            if (header && !allowedKeys.includes(header)) {
                                console.log(`Skipping unmapped header: "${header}" with value: "${val}"`);
                            }
                            return;
                        }

                        if (header === "amount") {
                            // Ensure amount is a string and max 50 chars
                            const amountStr = String(val || "0").trim();
                            item[header] = amountStr.length > 50 ? amountStr.substring(0, 50) : amountStr;
                        } else if (header === "slots") {
                            item[header] = Math.max(0, Number(val.replace(/[^0-9.-]+/g, "")) || 0);
                        } else if (header === "members_count") {
                            item[header] = Math.max(0, Number(val.replace(/[^0-9.-]+/g, "")) || 0);
                        } else if (header === "date") {
                            // Normalize date to dd-mm-yyyy format
                            const dateVal = val.trim();
                            if (dateVal) {
                                item[header] = formatDate(dateVal);
                            }
                        } else if (header === "time") {
                            // Convert any time format to 12-hour with AM/PM (no seconds)
                            const timeVal = val.trim();
                            if (timeVal) {
                                item[header] = formatTime(timeVal);
                            }
                        } else if (header === "completed") {
                            item[header] = val.toLowerCase() === "true" || val === "1";
                        } else if (header === "winners" || header === "coordinator") {
                            const splitVals = val.split(';').map(v => v.trim()).filter(v => v !== "");
                            if (header === "coordinator") {
                                tempCoordinators.push(...splitVals);
                            } else {
                                item[header] = splitVals;
                            }
                        } else if (header === "category") {
                            // Always set category from CSV, even if GENERAL
                            const categoryValue = val.trim().toUpperCase();
                            item[header] = categoryValue;
                            console.log(`✓ Category set for "${item.event_name}": val="${val.trim()}" -> item.category="${item[header]}"`);
                        } else if (header === "fest") {
                            item[header] = val.toUpperCase() || "GENERAL";
                        } else {
                            item[header] = val;
                        }
                    });

                    item.coordinator = tempCoordinators;
                    item.phone_number = Array.from(new Set(tempPhones)).join(", ");

                    // Hash the plain password from CSV "Event Pass" column
                    if (!item.event_pass || item.event_pass.trim() === '') {
                        throw new Error(`Event Pass is required for "${item.event_name}". Please provide a password in the "Event Pass" column.`);
                    }
                    
                    // Convert plain password to bcrypt hash if not already hashed
                    if (!item.event_pass.startsWith('$2')) {
                        const salt = bcrypt.genSaltSync(10);
                        item.event_pass = bcrypt.hashSync(String(item.event_pass), salt);
                    }
                    
                    // Validate and truncate event_rules (max 1000 chars)
                    if (!item.event_rules) {
                        item.event_rules = "TBA";
                    } else if (typeof item.event_rules === 'string' && item.event_rules.length > 1000) {
                        item.event_rules = item.event_rules.substring(0, 1000);
                        console.warn(`Truncated event_rules for "${item.event_name}" to 1000 chars`);
                    }
                    
                    // Validate and truncate details (max 1000 chars)
                    if (item.details) {
                        if (typeof item.details !== 'string') {
                            item.details = String(item.details);
                        }
                        if (item.details.length > 1000) {
                            item.details = item.details.substring(0, 1000);
                            console.warn(`Truncated details for "${item.event_name}" to 1000 chars`);
                        }
                    }
                    
                    console.log(`Before defaults - Event: "${item.event_name}", category: "${item.category}"`);
                    if (!item.category) {
                        item.category = "GENERAL";
                        console.log(`Applied default category for "${item.event_name}"`);
                    }
                    if (!item.fest) item.fest = "GENERAL";
                    if (!item.members_count) item.members_count = 0;
                    item.winners = item.winners || [];
                    item.coordinator = item.coordinator || [];

                    if (item.poster === "" || !isValidUrl(item.poster)) {
                        delete item.poster;
                    }

                    return item;
                });

            // Filter out rows missing event_name (like junk rows at the end)
            const dataToUpload = processedItems.filter(item => {
                // Ensure event_name exists
                if (!item.event_name || item.event_name.trim() === '') {
                    return false;
                }
                // Ensure event_pass exists and is hashed
                if (!item.event_pass || item.event_pass.trim() === '') {
                    console.error(`Missing event_pass for event: ${item.event_name}`);
                    return false;
                }
                // Verify password was hashed (safety check)
                if (!item.event_pass.startsWith('$2')) {
                    console.error(`Event pass not hashed for: ${item.event_name}`);
                    return false;
                }
                // Ensure amount is a string and max 50 chars
                if (!item.amount || typeof item.amount !== 'string') {
                    item.amount = "0";
                } else {
                    item.amount = String(item.amount).trim();
                    if (item.amount.length > 50) {
                        item.amount = item.amount.substring(0, 50);
                    }
                }
                return true;
            });
            
            const skippedCount = processedItems.length - dataToUpload.length;

            if (dataToUpload.length === 0) {
                alert("Error: No valid events found. Please ensure the 'Event' column is filled.");
                return;
            }

            if (skippedCount > 0) {
                console.log(`Skipped ${skippedCount} rows missing event name.`);
            }

            try {
                const result = await createManyItems('events', dataToUpload);
                console.log('Upload result:', result);
                
                if (!result || typeof result !== 'object') {
                    throw new Error('Invalid response from server');
                }
                
                if (result.success) {
                    // Check if there were duplicates skipped
                    if ('duplicates' in result && result.duplicates && result.duplicates.length > 0) {
                        const duplicateList = result.duplicates.map(d => 
                            `  • Row ${d.index}: "${d.event_name}" (${d.fest})`
                        ).join('\n');
                        alert(
                            `Upload Complete\n\n` +
                            `✓ Successfully uploaded: ${result.created} event(s)\n` +
                            `⚠ Skipped ${result.duplicates.length} duplicate(s):\n\n${duplicateList}\n\n` +
                            `These events already exist in the database.`
                        );
                    } else {
                        alert(`Successfully uploaded ${result.created || dataToUpload.length} events.`);
                    }
                } else {
                    // Show detailed error message for validation errors
                    const errorMsg = result.error && typeof result.error === 'string' 
                        ? result.error 
                        : (result.error && typeof result.error === 'object' 
                            ? JSON.stringify(result.error) 
                            : 'Failed to upload events. Unknown error.');
                    alert(`Upload Failed\n\n${errorMsg}\n\nCheck console for details.`);
                    console.error('Bulk upload error:', result);
                }
            } catch (error) {
                console.error('Upload exception:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                alert(`Upload Failed\n\nAn unexpected error occurred:\n${errorMessage}\n\nCheck console for details.`);
            }

            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        };
        reader.readAsText(file);
    };

    const handleDeleteMany = async (items: EventType[]) => {
        if (confirm(`Are you sure you want to delete ${items.length} events?`)) {
            await Promise.all(items.map(item => deleteItem('events', item.$id)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Events"
                    value={total}
                    icon={Calendar}
                    color="text-amber-500"
                />
                <div onClick={handleOverview} className="cursor-pointer">
                    <StatsCard
                        title="Overview"
                        value="View Report"
                        icon={BarChart3}
                        color="text-purple-500"
                        subValue="Graphic analysis"
                    />
                </div>
                <div onClick={() => setIsAnalysisOpen(true)} className="cursor-pointer">
                    <StatsCard
                        title="Event Analysis"
                        value="Analyze"
                        icon={BarChart3}
                        color="text-cyan-500"
                        subValue="Per-event stats"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleBulkUpload}
                />
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white gap-2"
                >
                    <Upload className="h-4 w-4" />
                    Bulk Upload
                </Button>
                <Button
                    onClick={() => {
                        setSelectedItem(null);
                        setFormData({});
                        setIsEditOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Event
                </Button>
            </div>

            <DataTable
                data={processedEvents}
                columns={columns}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onDeleteMany={handleDeleteMany}
                searchKeys={["event_name", "$id"]}
                placeholder="Search by event name or ID..."
                filterKeys={["venue", "time", "date", "amount", "fest", "category", "slots", "completed"]}
                headerColor="text-orange-400"
                getRowClassName={(item) => {
                    const cat = item.category?.toUpperCase();
                    if (cat === 'TECHNICAL') return 'border-l-cyan-500 bg-cyan-500/5';
                    if (cat === 'CULTURAL') return 'border-l-purple-500 bg-purple-500/5';
                    return 'border-l-emerald-500 bg-emerald-500/5';
                }}
            />

            <OverviewModal
                isOpen={isOverviewOpen}
                onClose={() => setIsOverviewOpen(false)}
                title="Events Overview"
                metrics={overviewData.metrics}
                chartData={overviewData.chartData}
                report={overviewData.report}
            />

            {/* Event Analysis Modal */}
            <Modal
                isOpen={isAnalysisOpen}
                onClose={() => {
                    setIsAnalysisOpen(false);
                    setSelectedEventId("");
                }}
                title="Per-Event Analysis"
            >
                <div className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Select Event to Analyze</label>
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-white outline-none focus:border-cyan-500 transition-colors"
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            <option value="" className="bg-zinc-900 text-gray-400">Select an event...</option>
                            {initialData.map(event => (
                                <option key={event.$id} value={event.$id} className="bg-zinc-900">
                                    {event.event_name} ({event.$id})
                                </option>
                            ))}
                        </select>
                    </div>

                    {eventStats ? (
                        <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h3 className="text-xl font-bold text-cyan-400 mb-2">{eventStats.name}</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Participants</p>
                                    <p className="text-2xl font-bold text-white">{eventStats.participants}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Revenue</p>
                                    <p className="text-2xl font-bold text-green-400">₹{eventStats.revenue.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-white/5 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Event Pricing</p>
                                <p className="text-sm text-gray-300 font-medium">{eventStats.displayPrice}</p>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs text-gray-400 italic">
                                    This analysis is based on {eventStats.participants} tickets generated for this event ID.
                                </p>
                            </div>
                        </div>
                    ) : selectedEventId ? (
                        <div className="text-center py-8 text-gray-500 italic">
                            Loading analysis...
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 italic border border-dashed border-white/10 rounded-xl">
                            Please select an event from the list above to view analysis.
                        </div>
                    )}
                </div>
                <div className="flex justify-end mt-6">
                    <Button variant="ghost" onClick={() => setIsAnalysisOpen(false)}>Close</Button>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Confirm Deletion"
                description="Delete this event?"
            >
                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                </div>
            </Modal>

            {/* Edit/Add Modal */}
            <Modal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title={selectedItem?.$id ? "Edit Event" : "Add Event"}
                watermark="/brahma-logo.png"
            >
                <form onSubmit={handleSave} className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Event Name</label>
                        <Input
                            value={formData.event_name || ''}
                            onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Venue</label>
                            <Input
                                value={formData.venue || ''}
                                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Date</label>
                            <Input
                                type="date"
                                value={formData.date || ''}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Time</label>
                        <Input
                            type="time"
                            value={formData.time ? (formData.time.includes('AM') || formData.time.includes('PM') ? convertTo24Hour(formData.time) : formData.time) : ''}
                            onChange={(e) => {
                                const time24 = e.target.value;
                                const time12 = convertTo12Hour(time24);
                                setFormData({ ...formData, time: time12 });
                            }}
                        />
                        <p className="text-xs text-gray-500">Format: {formData.time || 'HH:MM AM/PM'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Amount</label>
                            <Input
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Slots</label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.slots || ''}
                                onChange={(e) => setFormData({ ...formData, slots: Math.max(0, Number(e.target.value)) })}
                                required
                            />
                        </div>                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Members Count</label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.members_count || ''}
                                onChange={(e) => setFormData({ ...formData, members_count: Math.max(0, Number(e.target.value)) })}
                                required
                            />
                        </div>                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Category</label>
                            <Select
                                value={formData.category || ''}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                <option value="">Select Category</option>
                                {CATEGORY_OPTIONS.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Fest (Enum)</label>
                            <Select
                                value={formData.fest || ''}
                                onChange={(e) => setFormData({ ...formData, fest: e.target.value })}
                                required
                            >
                                <option value="">Select Fest</option>
                                {FEST_OPTIONS.map((fest) => (
                                    <option key={fest} value={fest}>
                                        {fest}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Event Pass</label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.event_pass || ''}
                                onChange={(e) => setFormData({ ...formData, event_pass: e.target.value })}
                                placeholder="Enter event password"
                                required
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const newPass = generateEventPass();
                                    setFormData({ ...formData, event_pass: newPass });
                                }}
                                className="shrink-0"
                                title="Generate new event pass"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Event Rules</label>
                        <textarea
                            value={formData.event_rules || ''}
                            onChange={(e) => setFormData({ ...formData, event_rules: e.target.value })}
                            required
                            rows={8}
                            placeholder="Enter each rule on a new line"
                            className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Details (Description)</label>
                        <Input
                            value={formData.details || ''}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Phone Number (Comma separated)</label>
                        <Input
                            value={formatArrayForInput(formData.phone_number)}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value as any })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Winners (Comma separated)</label>
                            <Input
                                value={formatArrayForInput(formData.winners)}
                                onChange={(e) => setFormData({ ...formData, winners: e.target.value as any })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Coordinator (Comma separated)</label>
                            <Input
                                value={formatArrayForInput(formData.coordinator)}
                                onChange={(e) => setFormData({ ...formData, coordinator: e.target.value as any })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={handleCloseForm}>Cancel</Button>
                        <Button type="submit" className="bg-cyan-500 text-black hover:bg-cyan-400">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
