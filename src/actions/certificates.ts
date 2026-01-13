'use server';

import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

export async function getCertificatesFromFirebase() {
    try {
        const certificatesRef = collection(db, 'certificates');
        const q = query(certificatesRef, orderBy('uploadedAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const certificates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        
        return { success: true, certificates };
    } catch (error) {
        console.error('Error fetching certificates:', error);
        return { success: false, error: 'Failed to fetch certificates', certificates: [] };
    }
}

export async function saveCertificateToFirebase(url: string, path: string, userId?: string) {
    try {
        const certificatesRef = collection(db, 'certificates');
        await addDoc(certificatesRef, {
            url,
            path,
            userId: userId || 'general',
            uploadedAt: Timestamp.now()
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error saving certificate:', error);
        return { success: false, error: 'Failed to save certificate' };
    }
}

export async function deleteCertificateFromFirebase(id: string, path: string) {
    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'certificates', id));
        
        // Delete from Storage
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting certificate:', error);
        return { success: false, error: 'Failed to delete certificate' };
    }
}
