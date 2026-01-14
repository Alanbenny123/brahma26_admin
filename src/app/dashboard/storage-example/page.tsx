'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { uploadCertificateClient, uploadQRCodeClient, uploadEventImageClient, deleteImageClient } from '@/lib/client-storage';

export default function StorageExamplePage() {
    const [uploading, setUploading] = useState(false);
    const [uploadedUrls, setUploadedUrls] = useState<{type: string; url: string; path: string}[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please use JPG, PNG, or WebP');
            return;
        }

        if (file.size > maxSize) {
            alert('File too large. Maximum size is 5MB');
            return;
        }

        setUploading(true);
        let result;

        // Example IDs - in real app, these would come from your data
        const exampleUserId = 'user_' + Date.now();
        const exampleTicketId = 'ticket_' + Date.now();
        const exampleEventId = 'event_' + Date.now();

        try {
            switch (type) {
                case 'certificate':
                    result = await uploadCertificateClient(file, exampleUserId);
                    break;
                case 'qrcode':
                    result = await uploadQRCodeClient(file, exampleTicketId);
                    break;
                case 'event':
                    result = await uploadEventImageClient(file, exampleEventId);
                    break;
                default:
                    throw new Error('Invalid upload type');
            }

            if (result.success && result.url) {
                setUploadedUrls(prev => [...prev, { type, url: result.url!, path: result.path! }]);
                alert('Upload successful!');
            } else {
                alert('Upload failed: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (path: string, index: number) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        const result = await deleteImageClient(path);
        if (result.success) {
            setUploadedUrls(prev => prev.filter((_, i) => i !== index));
            alert('Image deleted successfully');
        } else {
            alert('Failed to delete image: ' + result.error);
        }
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-white/90">Firebase Storage Example</h1>
                <p className="text-white/60 mt-2">
                    Upload images directly to Firebase Storage
                </p>
            </div>

            {/* Upload Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Certificate Upload */}
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white/90">Certificate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition">
                            <Upload className="w-8 h-8 text-white/60" />
                            <span className="text-white/80 text-sm">Upload Certificate</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'certificate')}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                        <p className="text-white/50 text-xs mt-2">
                            Path: certificates/{`{userId}`}/{`{timestamp}_{filename}`}
                        </p>
                    </CardContent>
                </Card>

                {/* QR Code Upload */}
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white/90">QR Code</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition">
                            <Upload className="w-8 h-8 text-white/60" />
                            <span className="text-white/80 text-sm">Upload QR Code</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'qrcode')}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                        <p className="text-white/50 text-xs mt-2">
                            Path: qrcodes/{`{ticketId}`}/{`{timestamp}_{filename}`}
                        </p>
                    </CardContent>
                </Card>

                {/* Event Image Upload */}
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg text-white/90">Event Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition">
                            <Upload className="w-8 h-8 text-white/60" />
                            <span className="text-white/80 text-sm">Upload Event Image</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, 'event')}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                        <p className="text-white/50 text-xs mt-2">
                            Path: events/{`{eventId}`}/{`{timestamp}_{filename}`}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {uploading && (
                <Card className="glass-card border-white/10 bg-blue-500/10">
                    <CardContent className="py-4">
                        <p className="text-white/80 text-center">Uploading...</p>
                    </CardContent>
                </Card>
            )}

            {/* Uploaded Images */}
            {uploadedUrls.length > 0 && (
                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl text-white/90">Uploaded Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {uploadedUrls.map((item, index) => (
                                <div key={index} className="bg-white/5 rounded-lg p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/70 text-sm capitalize">
                                            {item.type}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDelete(item.path, index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="aspect-video bg-white/10 rounded flex items-center justify-center overflow-hidden">
                                        <img
                                            src={item.url}
                                            alt={item.type}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-white/50 text-xs break-all">
                                        {item.url}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="text-xl text-white/90">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-white/70">
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">Storage Strategy</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Images are uploaded directly to Firebase Storage</li>
                            <li>URLs are then stored in Appwrite and synced to Firestore</li>
                            <li>Non-image data is stored in Appwrite and auto-synced to Firebase</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">File Validation</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>Max file size: 5MB</li>
                            <li>Accepted formats: JPG, PNG, WebP</li>
                            <li>Automatic timestamping prevents conflicts</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-white/90 mb-2">Usage in Real App</h3>
                        <p className="text-sm">
                            In a real application, you would:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                            <li>Upload image to Firebase Storage (get URL)</li>
                            <li>Store data in Appwrite with the image URL</li>
                            <li>Real-time sync automatically syncs to Firebase Firestore</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

