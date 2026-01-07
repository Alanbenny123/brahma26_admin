# Image Storage Strategy

## Overview
This project uses a **dual storage strategy** for data:
- **Non-image data** → Stored in Appwrite → Auto-synced to Firebase Firestore
- **Image data** → Directly stored in Firebase Storage → URLs stored in Firestore

## Why This Strategy?

### Benefits
1. **Performance**: Images stored in Firebase Storage are served via CDN
2. **Cost Effective**: Pay only for storage and bandwidth used
3. **Scalability**: Firebase Storage scales automatically
4. **Consistency**: Appwrite remains source of truth for non-image data
5. **Real-time Sync**: Changes in Appwrite automatically sync to Firebase

## Image Types

### 1. Certificates (User)
- **Path**: `certificates/{userId}/{timestamp}_{filename}`
- **Field in Firestore**: `certificates` (array of URLs)
- **Usage**: Store user certificates/achievements

### 2. QR Codes (Ticket)
- **Path**: `qrcodes/{ticketId}/{timestamp}_{filename}`
- **Field in Firestore**: `qrCodeUrl` (string)
- **Usage**: Store ticket QR codes for scanning

### 3. Event Images
- **Path**: `events/{eventId}/{timestamp}_{filename}`
- **Field in Firestore**: `imageUrl` (string)
- **Usage**: Store event banner/poster images

### 4. Profile Images (User)
- **Path**: `profiles/{userId}/{timestamp}_{filename}`
- **Field in Firestore**: `profileImageUrl` (string)
- **Usage**: Store user profile pictures

## Implementation

### Server-Side Upload (Server Actions)

```typescript
import { uploadCertificate, uploadQRCode, uploadEventImage } from '@/actions/storage';

// Upload certificate
const file = formData.get('certificate') as File;
const result = await uploadCertificate(file, userId);
if (result.success) {
    console.log('Certificate URL:', result.url);
    // Store result.url in Appwrite user data
}

// Upload QR code
const qrFile = formData.get('qrCode') as File;
const qrResult = await uploadQRCode(qrFile, ticketId);
if (qrResult.success) {
    console.log('QR Code URL:', qrResult.url);
    // Store qrResult.url in Appwrite ticket data
}

// Upload event image
const eventImage = formData.get('eventImage') as File;
const eventResult = await uploadEventImage(eventImage, eventId);
if (eventResult.success) {
    console.log('Event Image URL:', eventResult.url);
    // Store eventResult.url in Appwrite event data
}
```

### Client-Side Upload (React Components)

```typescript
'use client';

import { uploadCertificateClient, uploadQRCodeClient } from '@/lib/client-storage';
import { useState } from 'react';

export default function UploadForm() {
    const [uploading, setUploading] = useState(false);
    
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        const result = await uploadCertificateClient(file, userId);
        setUploading(false);
        
        if (result.success) {
            console.log('Uploaded:', result.url);
            // Store URL in your state or send to server
        }
    };
    
    return (
        <input 
            type="file" 
            accept="image/*" 
            onChange={handleUpload}
            disabled={uploading}
        />
    );
}
```

## Workflow

### Adding a User with Certificate

1. **Upload Certificate to Firebase Storage**
   ```typescript
   const certResult = await uploadCertificate(certificateFile, userId);
   ```

2. **Store User Data in Appwrite** (with certificate URL)
   ```typescript
   await appwriteDatabase.createDocument(
       databaseId,
       'users',
       userId,
       {
           name: 'John Doe',
           email: 'john@example.com',
           certificates: [certResult.url], // Store URL
       }
   );
   ```

3. **Auto-Sync to Firebase** (via real-time sync)
   - Appwrite event triggers
   - Real-time sync picks it up
   - Syncs to Firebase Firestore with certificate URL

### Adding an Event with Image

1. **Upload Event Image**
   ```typescript
   const imageResult = await uploadEventImage(imageFile, eventId);
   ```

2. **Store Event Data in Appwrite**
   ```typescript
   await appwriteDatabase.createDocument(
       databaseId,
       'events',
       eventId,
       {
           name: 'Tech Conference 2026',
           date: '2026-03-15',
           imageUrl: imageResult.url, // Store URL
       }
   );
   ```

3. **Auto-Sync to Firebase**
   - Real-time sync handles it automatically

### Adding a Ticket with QR Code

1. **Generate/Upload QR Code**
   ```typescript
   const qrResult = await uploadQRCode(qrCodeFile, ticketId);
   ```

2. **Store Ticket Data in Appwrite**
   ```typescript
   await appwriteDatabase.createDocument(
       databaseId,
       'tickets',
       ticketId,
       {
           user_id: userId,
           event_id: eventId,
           qrCodeUrl: qrResult.url, // Store URL
       }
   );
   ```

3. **Auto-Sync to Firebase**
   - Syncs with QR code URL

## Security Rules

### Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Certificates - authenticated users can read, only specific user can write
    match /certificates/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // QR Codes - anyone can read, authenticated can write
    match /qrcodes/{ticketId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Events - anyone can read, authenticated can write
    match /events/{eventId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Profiles - authenticated users can read, only specific user can write
    match /profiles/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Events collection
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Tickets collection
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Best Practices

### 1. File Validation
- Always validate file type and size before upload
- Recommended max size: 5MB for images
- Accepted formats: jpg, jpeg, png, webp

```typescript
function validateImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
        console.error('Invalid file type');
        return false;
    }
    
    if (file.size > maxSize) {
        console.error('File too large');
        return false;
    }
    
    return true;
}
```

### 2. Image Optimization
- Compress images before upload
- Use WebP format when possible
- Resize images to appropriate dimensions

### 3. Error Handling
- Always handle upload failures
- Provide user feedback during upload
- Clean up partial uploads on failure

```typescript
try {
    const result = await uploadCertificate(file, userId);
    if (!result.success) {
        throw new Error(result.error);
    }
    // Success - use result.url
} catch (error) {
    console.error('Upload failed:', error);
    // Show user-friendly error message
}
```

### 4. Cleanup
- Delete old images when uploading new ones
- Use the `deleteImageFromFirebase` function

```typescript
// Before uploading new certificate, delete old one
if (oldCertificateUrl) {
    const oldPath = oldCertificateUrl.split('/o/')[1]?.split('?')[0];
    if (oldPath) {
        await deleteImageFromFirebase(decodeURIComponent(oldPath));
    }
}
```

## API Reference

### Server Actions (`src/actions/storage.ts`)

- `uploadImageToFirebase(file, path)` - Generic upload
- `uploadCertificate(file, userId)` - Upload certificate
- `uploadQRCode(file, ticketId)` - Upload QR code
- `uploadEventImage(file, eventId)` - Upload event image
- `uploadProfileImage(file, userId)` - Upload profile image
- `deleteImageFromFirebase(path)` - Delete image
- `getUserCertificates(userId)` - Get all certificates for user
- `getTicketQRCode(ticketId)` - Get QR code for ticket

### Client-Side Utilities (`src/lib/client-storage.ts`)

- `uploadImageClient(file, path)` - Generic client upload
- `uploadCertificateClient(file, userId)` - Client certificate upload
- `uploadQRCodeClient(file, ticketId)` - Client QR code upload
- `uploadEventImageClient(file, eventId)` - Client event image upload
- `deleteImageClient(path)` - Client-side delete

## Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Troubleshooting

### Images not uploading
1. Check Firebase Storage is enabled in Firebase Console
2. Verify environment variables are set correctly
3. Check browser console for CORS errors
4. Ensure file size is within limits

### URLs not working
1. Verify Firebase Storage rules allow public read
2. Check URL format is correct
3. Ensure file was uploaded successfully

### Sync issues
1. Verify real-time sync is running
2. Check Appwrite webhook/subscription is active
3. Ensure image URLs are properly stored in Appwrite

## Summary

**Flow**: Upload Image → Get URL → Store in Appwrite → Auto-sync to Firebase

This strategy keeps your data synchronized while leveraging Firebase's powerful image storage and delivery capabilities.

