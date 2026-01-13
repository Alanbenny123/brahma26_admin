'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Upload, Trash2, Eye, ImageIcon, Plus } from "lucide-react";
import { uploadEventImageClient } from "@/lib/client-storage";
import { updateItem } from "@/actions/appwrite";
import { StatsCard } from "@/components/dashboard/stats-card";
import Image from "next/image";

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
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [eventSearchTerm, setEventSearchTerm] = useState('');

    const eventsWithPosters = events.filter(e => e.poster);
    const eventsWithoutPosters = events.filter(e => !e.poster);

    // Filter events based on search term
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
                const updateResult = await updateItem('events', selectedEventId, {
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

        const updateResult = await updateItem('events', event.$id, {
            poster: ''
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

    return (
        <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard
                    title="Events with Posters"
                    value={eventsWithPosters.length}
                    icon={ImageIcon}
                    color="text-blue-500"
                />
                <StatsCard
                    title="Events without Posters"
                    value={eventsWithoutPosters.length}
                    icon={ImageIcon}
                    color="text-gray-500"
                />
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
                                        {event.date && <p>Date: {event.date}</p>}
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

            {/* Events without Posters */}
            {eventsWithoutPosters.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold text-white/90 mb-4">Events without Posters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {eventsWithoutPosters.map((event) => (
                            <Card key={event.$id} className="glass-card border-white/10">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-white/90 font-medium">{event.event_name}</p>
                                            <p className="text-xs text-white/40">{event.fest}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setSelectedEventId(event.$id);
                                                setIsUploadOpen(true);
                                            }}
                                        >
                                            <Upload className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {events.length === 0 && (
                <div className="text-center py-12 text-white/50">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No events found</p>
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Event Poster">
                <form onSubmit={handleUpload} className="space-y-4">
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
                            onClick={() => setIsUploadOpen(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={uploading}
                            className="bg-green-500 hover:bg-green-600"
                        >
                            {uploading ? 'Uploading...' : 'Upload Poster'}
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
                            {selectedEvent.date && <p>Date: {selectedEvent.date}</p>}
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
