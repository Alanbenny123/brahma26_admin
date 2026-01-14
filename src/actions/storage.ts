'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Upload image to Firebase Storage
export async function uploadImageToFirebase(file: File, path: string) {
    try {
        // Create a reference to the file location
        const storageRef = ref(storage, path);
        
        // Convert File to ArrayBuffer then to Uint8Array for server-side upload
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, uint8Array, {
            contentType: file.type,
        });
        
        // Get the download URL
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

// Upload certificate image
export async function uploadCertificate(file: File, userId: string) {
    const timestamp = Date.now();
    const path = `certificates/${userId}/${timestamp}_${file.name}`;
    return await uploadImageToFirebase(file, path);
}

// Upload QR code image
export async function uploadQRCode(file: File, ticketId: string) {
    const timestamp = Date.now();
    const path = `qrcodes/${ticketId}/${timestamp}_${file.name}`;
    return await uploadImageToFirebase(file, path);
}

// Upload event image
export async function uploadEventImage(file: File, eventId: string) {
    const timestamp = Date.now();
    const path = `events/${eventId}/${timestamp}_${file.name}`;
    return await uploadImageToFirebase(file, path);
}

// Upload user profile image
export async function uploadProfileImage(file: File, userId: string) {
    const timestamp = Date.now();
    const path = `profiles/${userId}/${timestamp}_${file.name}`;
    return await uploadImageToFirebase(file, path);
}

// Delete image from Firebase Storage
export async function deleteImageFromFirebase(imagePath: string) {
    try {
        const storageRef = ref(storage, imagePath);
        await deleteObject(storageRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting image:', error);
        return { success: false, error: 'Failed to delete image' };
    }
}

// Get all certificates for a user
export async function getUserCertificates(userId: string) {
    try {
        const certificatesRef = ref(storage, `certificates/${userId}`);
        const result = await listAll(certificatesRef);
        
        const certificates = await Promise.all(
            result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    path: itemRef.fullPath,
                    url: url
                };
            })
        );
        
        return { success: true, certificates };
    } catch (error) {
        console.error('Error getting certificates:', error);
        return { success: false, certificates: [], error: 'Failed to get certificates' };
    }
}

// Get QR code for a ticket
export async function getTicketQRCode(ticketId: string) {
    try {
        const qrCodesRef = ref(storage, `qrcodes/${ticketId}`);
        const result = await listAll(qrCodesRef);
        
        if (result.items.length > 0) {
            // Get the latest QR code
            const latestQR = result.items[result.items.length - 1];
            const url = await getDownloadURL(latestQR);
            return {
                success: true,
                url: url,
                path: latestQR.fullPath,
                name: latestQR.name
            };
        }
        
        return { success: false, error: 'No QR code found' };
    } catch (error) {
        console.error('Error getting QR code:', error);
        return { success: false, error: 'Failed to get QR code' };
    }
}

