'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Upload, Trash2, Eye, ImageIcon, Plus, Search, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { uploadEventImageClient } from "@/lib/client-storage";
import { updateFirestoreEvent } from "@/actions/firebase";
import { StatsCard } from "@/components/dashboard/stats-card";
import { formatDate } from "@/lib/date-utils";
import Image from "next/image";
import { useActivityLogger } from "@/lib/use-activity-logger";

interface Event {
    $id: string;
    event_name: string;
    fest: string;
    poster?: string;
    date?: string;
    category?: string;
}

interface ClientEventPostersPageProps {
    events: Event[];
    total: number;
}

export default function ClientEventPostersPage({ events, total }: ClientEventPostersPageProps) {
    useActivityLogger();
    
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [eventSearchTerm, setEventSearchTerm] = useState('');
    const [mainSearchTerm, setMainSearchTerm] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [showNoPostersList, setShowNoPostersList] = useState(true);

    // Filter events based on main page search term
    const searchFilteredEvents = events.filter(event => 
        event.event_name.toLowerCase().includes(mainSearchTerm.toLowerCase()) ||
        event.fest.toLowerCase().includes(mainSearchTerm.toLowerCase()) ||
        (event.category?.toLowerCase().includes(mainSearchTerm.toLowerCase()))
    );

    const eventsWithPosters = searchFilteredEvents.filter(e => e.poster);
    const eventsWithoutPosters = searchFilteredEvents.filter(e => !e.poster);

    // Filter events based on modal search term (for dropdown)
    const filteredEvents = events.filter(event => 
        event.event_name.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        event.fest.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
        (event.category?.toLowerCase().includes(eventSearchTerm.toLowerCase()))
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please use JPG, PNG, or WebP');
            return;
        }

        if (file.size > maxSize) {
            alert('File too large. Maximum size is 10MB');
            return;
        }

        setSelectedFile(file);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !selectedEventId) {
            alert('Please select an event and a file');
            return;
        }

        setUploading(true);

        try {
            const result = await uploadEventImageClient(selectedFile, selectedEventId);

            if (result.success && result.url) {
                // Update event's poster field in Appwrite
                const updateResult = await updateFirestoreEvent(selectedEventId, {
                    poster: result.url
                });

                if (updateResult.success) {
                    setIsUploadOpen(false);
                    setSelectedEventId('');
                    setSelectedFile(null);
                    alert('Event poster uploaded successfully!');
                    window.location.reload();
                } else {
                    alert('Failed to update event: ' + updateResult.error);
                }
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (event: Event) => {
        if (!confirm(`Remove poster from "${event.event_name}"?`)) return;

        const updateResult = await updateFirestoreEvent(event.$id, {
            poster: null
        });

        if (updateResult.success) {
            alert('Poster removed successfully');
            window.location.reload();
        } else {
            alert('Failed to remove poster');
        }
    };

    const handleView = (event: Event) => {
        setSelectedEvent(event);
        setIsViewOpen(true);
    };

    const handleEdit = (event: Event) => {
        setSelectedEventId(event.$id);
        setIsEditMode(true);
        setIsUploadOpen(true);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                        type="text"
                        placeholder="Search events by name, fest, or category..."
                        value={mainSearchTerm}
                        onChange={(e) => setMainSearchTerm(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white/90 placeholder:text-white/40"
                    />
                </div>
                {mainSearchTerm && (
                    <Button
                        variant="outline"
                        onClick={() => setMainSearchTerm('')}
                        className="text-white/60 hover:text-white/90"
                    >
                        Clear
                    </Button>
                )}
            </div>

            {/* Results Count */}
            {mainSearchTerm && (
                <p className="text-sm text-white/60">
                    Found {searchFilteredEvents.length} event{searchFilteredEvents.length !== 1 ? 's' : ''} 
                    {eventsWithPosters.length > 0 && ` (${eventsWithPosters.length} with poster${eventsWithPosters.length !== 1 ? 's' : ''})`}
                </p>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard
                    title="Events with Posters"
                    value={eventsWithPosters.length}
                    icon={ImageIcon}
                    color="text-blue-500"
                />
                <div onClick={() => setShowNoPostersList(!showNoPostersList)} className="cursor-pointer">
                    <StatsCard
                        title="Events without Posters"
                        value={eventsWithoutPosters.length}
                        icon={showNoPostersList ? ChevronUp : ChevronDown}
                        color="text-yellow-500"
                        subValue={showNoPostersList ? "Click to hide list" : "Click to show list"}
                    />
                </div>
                <div onClick={() => setIsUploadOpen(true)} className="cursor-pointer">
                    <StatsCard
                        title="Upload Poster"
                        value="Add New"
                        icon={Plus}
                        color="text-green-500"
                        subValue="Upload event poster"
                    />
                </div>
            </div>

            {/* Events with Posters */}
            {eventsWithPosters.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-white/90 mb-4">Events with Posters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {eventsWithPosters.map((event) => (
                            <Card key={event.$id} className="glass-card border-white/10 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg text-white/90 flex items-center justify-between">
                                        <span className="truncate">{event.event_name}</span>
                                        <ImageIcon className="w-5 h-5 text-blue-500" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Poster Preview */}
                                    <div className="relative w-full h-48 bg-black/30 rounded-lg overflow-hidden">
                                        {event.poster && (
                                            <Image
                                                src={event.poster}
                                                alt={event.event_name}
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                    </div>

                                    {/* Event Info */}
                                    <div className="text-xs text-white/40 space-y-1">
                                        {event.fest && <p>Fest: {event.fest}</p>}
                                        {event.category && <p>Category: {event.category}</p>}
                                        {event.date && <p>Date: {formatDate(event.date)}</p>}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleView(event)}
                                            className="flex-1"
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(event)}
                                            className="flex-1 text-cyan-400 hover:text-cyan-300"
                                        >
                                            <Edit className="w-4 h-4 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(event)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Events without Posters - Expandable List */}
            {eventsWithoutPosters.length > 0 && showNoPostersList && (
                <Card className="glass-card border-yellow-500/30 bg-yellow-500/5">
                    <CardHeader>
                        <CardTitle className="text-white/90 flex items-center justify-between">
                            <span>Events without Posters ({eventsWithoutPosters.length})</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowNoPostersList(false)}
                                className="text-white/60"
                            >
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Hide
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Simple List View */}
                        <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                            <h3 className="text-sm font-semibold text-yellow-400 mb-3">Event Names List:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {eventsWithoutPosters.map((event, index) => (
                                    <div key={event.$id} className="flex items-start gap-2 text-sm">
                                        <span className="text-yellow-500 font-mono">{(index + 1).toString().padStart(2, '0')}.</span>
                                        <div className="flex-1">
                                            <span className="text-white/90">{event.event_name}</span>
                                            <span className="text-white/40 text-xs ml-2">({event.fest})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card Grid View */}
                        <div>
                            <h3 className="text-sm font-semibold text-white/60 mb-3">Upload Posters:</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {eventsWithoutPosters.map((event) => (
                                    <Card key={event.$id} className="glass-card border-white/10 hover:border-yellow-500/30 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-white/90 font-medium">{event.event_name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-white/40">{event.fest}</span>
                                                        {event.category && (
                                                            <>
                                                                <span className="text-white/20">•</span>
                                                                <span className="text-xs text-white/40">{event.category}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {event.date && (
                                                        <p className="text-xs text-white/40 mt-1">{formatDate(event.date)}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedEventId(event.$id);
                                                        setIsUploadOpen(true);
                                                    }}
                                                    className="w-full bg-yellow-600 hover:bg-yellow-500"
                                                >
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Upload Poster
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchFilteredEvents.length === 0 && mainSearchTerm && (
                <div className="text-center py-12 text-white/50">
                    <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No events match your search</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                </div>
            )}

            {events.length === 0 && !mainSearchTerm && (
                <div className="text-center py-12 text-white/50">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No events found</p>
                </div>
            )}

            {/* Upload Modal */}
            <Modal 
                isOpen={isUploadOpen} 
                onClose={() => {
                    setIsUploadOpen(false);
                    setIsEditMode(false);
                    setSelectedEventId('');
                    setSelectedFile(null);
                    setEventSearchTerm('');
                }} 
                title={isEditMode ? "Update Event Poster" : "Upload Event Poster"}
            >
                <form onSubmit={handleUpload} className="space-y-4">
                    {!isEditMode && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Search Events</label>
                                <Input
                                    type="text"
                                    placeholder="Search by event name, fest, or category..."
                                    value={eventSearchTerm}
                                    onChange={(e) => setEventSearchTerm(e.target.value)}
                                    disabled={uploading}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500">
                                    {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Select Event *</label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    required
                                    disabled={uploading}
                                    className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-md text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500 max-h-48 overflow-y-auto"
                                >
                                    <option value="">Choose an event...</option>
                                    {filteredEvents.map((event) => (
                                        <option key={event.$id} value={event.$id}>
                                            {event.event_name} ({event.fest}){event.poster ? ' ⚠️ Has poster' : ''}
                                        </option>
                                    ))}
                                </select>
                                {filteredEvents.length === 0 && eventSearchTerm && (
                                    <p className="text-xs text-yellow-500">No events match your search</p>
                                )}
                            </div>
                        </>
                    )}

                    {isEditMode && (
                        <div className="space-y-2 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                            <h3 className="text-cyan-400 font-semibold">Updating Poster For:</h3>
                            <p className="text-white/90">{events.find(e => e.$id === selectedEventId)?.event_name}</p>
                            <p className="text-sm text-white/60">{events.find(e => e.$id === selectedEventId)?.fest}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Poster Image *</label>
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition">
                            <Upload className="w-8 h-8 text-white/60" />
                            <span className="text-white/80 text-sm">
                                {selectedFile ? selectedFile.name : 'Choose file (JPG, PNG, WebP)'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                disabled={uploading}
                                className="hidden"
                                required
                            />
                        </label>
                        <p className="text-xs text-gray-500">Max size: 10MB</p>
                    </div>

                    <div className="flex space-x-2 justify-end pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsUploadOpen(false);
                                setIsEditMode(false);
                                setSelectedEventId('');
                                setSelectedFile(null);
                                setEventSearchTerm('');
                            }}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={uploading}
                            className={isEditMode ? "bg-cyan-500 hover:bg-cyan-600" : "bg-green-500 hover:bg-green-600"}
                        >
                            {uploading ? 'Uploading...' : (isEditMode ? 'Update Poster' : 'Upload Poster')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={selectedEvent?.event_name || 'Event Poster'}>
                {selectedEvent && selectedEvent.poster && (
                    <div className="space-y-4">
                        <div className="relative w-full h-96 bg-black/30 rounded-lg overflow-hidden">
                            <Image
                                src={selectedEvent.poster}
                                alt={selectedEvent.event_name}
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                            <p>Event: {selectedEvent.event_name}</p>
                            <p>Fest: {selectedEvent.fest}</p>
                            {selectedEvent.category && <p>Category: {selectedEvent.category}</p>}
                            {selectedEvent.date && <p>Date: {formatDate(selectedEvent.date)}</p>}
                            <p className="break-all">URL: <a href={selectedEvent.poster} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{selectedEvent.poster}</a></p>
                        </div>
                        <Button
                            onClick={() => window.open(selectedEvent.poster, '_blank')}
                            className="w-full"
                        >
                            Open in New Tab
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
