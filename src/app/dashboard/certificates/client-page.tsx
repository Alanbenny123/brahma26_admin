'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Upload, Trash2, Eye, Award, Plus } from "lucide-react";
import { uploadCertificateClient } from "@/lib/client-storage";
import { getCertificatesFromFirebase, saveCertificateToFirebase, deleteCertificateFromFirebase } from "@/actions/certificates";
import { StatsCard } from "@/components/dashboard/stats-card";
import Image from "next/image";

interface Certificate {
    id: string;
    url: string;
    path: string;
    userId?: string;
    uploadedAt: string;
}

export default function ClientCertificatesPage() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
    const [uploading, setUploading] = useState(false);
    const [userId, setUserId] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);

    // Load certificates from Firebase on mount
    useEffect(() => {
        loadCertificates();
    }, []);

    const loadCertificates = async () => {
        setLoading(true);
        const result = await getCertificatesFromFirebase();
        if (result.success) {
            setCertificates(result.certificates);
        }
        setLoading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please use JPG, PNG, WebP, or PDF');
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
        if (!selectedFile) {
            alert('Please select a file');
            return;
        }

        setUploading(true);

        try {
            const userIdValue = userId || 'general';
            const result = await uploadCertificateClient(selectedFile, userIdValue);

            if (result.success && result.url) {
                // Save to Firebase Firestore
                const saveResult = await saveCertificateToFirebase(result.url, result.path!, userId);

                if (saveResult.success) {
                    setIsUploadOpen(false);
                    setUserId('');
                    setSelectedFile(null);
                    alert('Certificate uploaded successfully!');
                    await loadCertificates(); // Reload certificates
                } else {
                    alert('Failed to save certificate metadata');
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

    const handleDelete = async (cert: Certificate) => {
        if (!confirm('Are you sure you want to delete this certificate?')) return;

        const result = await deleteCertificateFromFirebase(cert.id, cert.path);
        
        if (result.success) {
            alert('Certificate deleted successfully');
            await loadCertificates(); // Reload certificates
        } else {
            alert('Failed to delete certificate');
        }
    };

    const handleView = (cert: Certificate) => {
        setSelectedCert(cert);
        setIsViewOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-white/60">Loading certificates...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-3">
                <StatsCard
                    title="Total Certificates"
                    value={certificates.length}
                    icon={Award}
                    color="text-yellow-500"
                />
                <div onClick={() => setIsUploadOpen(true)} className="cursor-pointer">
                    <StatsCard
                        title="Upload Certificate"
                        value="Add New"
                        icon={Plus}
                        color="text-green-500"
                        subValue="Upload certificate image"
                    />
                </div>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                    <Card key={cert.id} className="glass-card border-white/10 overflow-hidden">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-white/90 flex items-center justify-between">
                                <span className="truncate">Certificate</span>
                                <Award className="w-5 h-5 text-yellow-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Certificate Preview */}
                            <div className="relative w-full h-48 bg-black/30 rounded-lg overflow-hidden">
                                {cert.url.endsWith('.pdf') ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Award className="w-16 h-16 text-yellow-500/50" />
                                        <span className="text-white/50 text-sm ml-2">PDF</span>
                                    </div>
                                ) : (
                                    <Image
                                        src={cert.url}
                                        alt="Certificate"
                                        fill
                                        className="object-cover"
                                    />
                                )}
                            </div>

                            {/* Certificate Info */}
                            {cert.userId && (
                                <p className="text-xs text-white/40">
                                    User ID: {cert.userId}
                                </p>
                            )}
                            <p className="text-xs text-white/40">
                                Uploaded: {new Date(cert.uploadedAt).toLocaleDateString()}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleView(cert)}
                                    className="flex-1"
                                >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(cert)}
                                    className="text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {certificates.length === 0 && (
                    <div className="col-span-full text-center py-12 text-white/50">
                        <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>No certificates uploaded yet</p>
                        <p className="text-sm mt-2">Click "Upload Certificate" to add your first certificate</p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Certificate">
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">User ID (Optional)</label>
                        <Input
                            type="text"
                            placeholder="Leave empty for general certificate"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            disabled={uploading}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Certificate File *</label>
                        <label className="flex flex-col items-center gap-2 cursor-pointer p-6 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition">
                            <Upload className="w-8 h-8 text-white/60" />
                            <span className="text-white/80 text-sm">
                                {selectedFile ? selectedFile.name : 'Choose file (JPG, PNG, WebP, PDF)'}
                            </span>
                            <input
                                type="file"
                                accept="image/*,.pdf"
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
                            {uploading ? 'Uploading...' : 'Upload Certificate'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Certificate">
                {selectedCert && (
                    <div className="space-y-4">
                        <div className="relative w-full h-96 bg-black/30 rounded-lg overflow-hidden">
                            {selectedCert.url.endsWith('.pdf') ? (
                                <iframe
                                    src={selectedCert.url}
                                    className="w-full h-full"
                                    title="Certificate"
                                />
                            ) : (
                                <Image
                                    src={selectedCert.url}
                                    alt="Certificate"
                                    fill
                                    className="object-contain"
                                />
                            )}
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                            {selectedCert.userId && <p>User ID: {selectedCert.userId}</p>}
                            <p>Uploaded: {new Date(selectedCert.uploadedAt).toLocaleString()}</p>
                            <p className="break-all">URL: <a href={selectedCert.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{selectedCert.url}</a></p>
                        </div>
                        <Button
                            onClick={() => window.open(selectedCert.url, '_blank')}
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
