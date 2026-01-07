'use client';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Client-side upload (useful for forms with image inputs)
export async function uploadImageClient(file: File, path: string) {
    try {
        const storageRef = ref(storage, path);
        
        const snapshot = await uploadBytes(storageRef, file, {
            contentType: file.type,
        });
        
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return { 
            success: true, 
            url: downloadURL,
            path: snapshot.ref.fullPath,
            name: snapshot.ref.name
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        return { success: false, error: 'Failed to upload image' };
    }
}

// Client-side certificate upload
export async function uploadCertificateClient(file: File, userId: string) {
    const timestamp = Date.now();
    const path = `certificates/${userId}/${timestamp}_${file.name}`;
    return await uploadImageClient(file, path);
}

// Client-side QR code upload
export async function uploadQRCodeClient(file: File, ticketId: string) {
    const timestamp = Date.now();
    const path = `qrcodes/${ticketId}/${timestamp}_${file.name}`;
    return await uploadImageClient(file, path);
}

// Client-side event image upload
export async function uploadEventImageClient(file: File, eventId: string) {
    const timestamp = Date.now();
    const path = `events/${eventId}/${timestamp}_${file.name}`;
    return await uploadImageClient(file, path);
}

// Client-side delete
export async function deleteImageClient(imagePath: string) {
    try {
        const storageRef = ref(storage, imagePath);
        await deleteObject(storageRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting image:', error);
        return { success: false, error: 'Failed to delete image' };
    }
}

