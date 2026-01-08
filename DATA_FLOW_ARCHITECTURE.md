# Data Flow Architecture

## Overview

This application uses a **dual-database architecture** with Appwrite as the primary source and Firebase as the synchronized backup/fallback.

## Core Principle

```
✅ ALL ADMIN OPERATIONS → APPWRITE FIRST → AUTO-SYNC → FIREBASE
❌ NEVER write directly to Firebase from admin UI
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN UI (Browser)                      │
│  • Users Page    • Events Page    • Tickets Page            │
│  • Attendance    • Dashboard      • Forms                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ CREATE / UPDATE / DELETE
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              SERVER ACTIONS (Appwrite)                       │
│  • createItem()    • updateItem()    • deleteItem()         │
│  • createManyItems()                                        │
│  File: src/actions/appwrite.ts                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WRITES TO
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  APPWRITE (Primary DB)                       │
│  • Users Collection                                          │
│  • Events Collection                                         │
│  • Tickets Collection                                        │
│  • Attendance Collection                                     │
│  • Transactions Collection                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REAL-TIME EVENT DETECTED
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         REAL-TIME SYNC LISTENER (Client-Side)                │
│  • Listens to Appwrite WebSocket events                     │
│  • Detects create/update/delete operations                  │
│  File: src/lib/realtime-sync.ts                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              SYNC API ENDPOINT (Server-Side)                 │
│  • Receives sync requests from listener                     │
│  • Calls Firebase upsert/update/delete functions            │
│  File: src/app/api/sync/route.ts                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ SYNC OPERATIONS
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            FIREBASE ACTIONS (Sync Only)                      │
│  • upsertFirestoreUser()    • upsertFirestoreEvent()       │
│  • updateFirestoreUser()    • deleteFirestoreEvent()       │
│  File: src/actions/firebase.ts                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WRITES TO
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            FIREBASE FIRESTORE (Backup/Fallback)              │
│  • Users Collection (synced)                                 │
│  • Events Collection (synced)                                │
│  • Tickets Collection (synced)                               │
│  • Attendance Collection (synced)                            │
│  • Transactions Collection (synced)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Read Strategy (Smart Fallback)

```
┌─────────────────────────────────────────────────────────────┐
│                  DATA FETCH REQUEST                          │
│  File: src/actions/data-fetcher.ts                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Check Appwrite │
              │ Availability   │
              └────────┬───────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    Available                   Unavailable
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Fetch from      │         │ Fetch from      │
│ APPWRITE        │         │ FIREBASE        │
│ (Primary)       │         │ (Fallback)      │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Return Data    │
            │ + Source Info  │
            └────────────────┘
```

---

## Write Operations (MUST Follow This Flow)

### ✅ CORRECT: Admin Operation Flow

```typescript
// 1. User clicks "Create Event" button in UI
// 2. Form submits to server action

import { createItem, updateItem, deleteItem } from '@/actions/appwrite';  // ✅ CORRECT

// CREATE
const handleCreate = async (formData) => {
    const result = await createItem('events', formData);  // ✅ Writes to Appwrite
    // Real-time sync automatically handles Firebase creation
};

// UPDATE
const handleUpdate = async (id, formData) => {
    const result = await updateItem('events', id, formData);  // ✅ Updates in Appwrite
    // Real-time sync automatically handles Firebase update
};

// DELETE
const handleDelete = async (id) => {
    const result = await deleteItem('events', id);  // ✅ Deletes from Appwrite
    // Real-time sync automatically handles Firebase deletion
};
```

**What happens:**
1. ✅ Data created/updated/deleted in Appwrite
2. ✅ Real-time listener detects change
3. ✅ Automatically syncs to Firebase (create/update/delete)
4. ✅ Both databases stay in sync

### ❌ WRONG: Direct Firebase Write

```typescript
// DON'T DO THIS!
import { createFirestoreEvent } from '@/actions/firebase';  // ❌ WRONG

const handleSubmit = async (formData) => {
    await createFirestoreEvent(formData);  // ❌ Bypasses Appwrite
    // Now databases are out of sync!
};
```

**Why this is wrong:**
1. ❌ Appwrite doesn't have the data
2. ❌ Firebase becomes out of sync
3. ❌ Data fetcher will use wrong source
4. ❌ Breaks the architecture

---

## Image Storage (Exception to the Rule)

Images are stored differently because they require CDN delivery:

```
┌─────────────────────────────────────────────────────────────┐
│                   IMAGE UPLOAD FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. User uploads image file
   ↓
2. Upload directly to FIREBASE STORAGE (CDN-backed)
   File: src/actions/storage.ts
   Functions: uploadCertificate(), uploadEventImage(), etc.
   ↓
3. Get Firebase Storage CDN URL
   Example: https://firebasestorage.googleapis.com/.../image.jpg
   ↓
4. Store URL in APPWRITE event/user document
   File: src/actions/appwrite.ts
   ↓
5. Real-time sync copies URL to FIREBASE FIRESTORE
   ↓
6. Both databases have the same CDN URL reference
```

**Image Types:**
- `certificates/{userId}/{timestamp}_{filename}` - User certificates
- `qrcodes/{ticketId}/{timestamp}_{filename}` - Ticket QR codes
- `events/{eventId}/{timestamp}_{filename}` - Event images
- `profiles/{userId}/{timestamp}_{filename}` - Profile images

---

## File Reference Guide

### ✅ Use These for Admin Operations

| File | Purpose | When to Use |
|------|---------|-------------|
| `src/actions/appwrite.ts` | Primary database operations | All create/update/delete from admin UI |
| `src/actions/storage.ts` | Image uploads | Upload certificates, QR codes, event images |
| `src/actions/data-fetcher.ts` | Smart data reads | Fetch data with automatic fallback |

### 🔧 System/Sync Files (Don't Call Directly)

| File | Purpose | Used By |
|------|---------|---------|
| `src/actions/firebase.ts` | Sync & fallback operations | Sync API, data-fetcher fallback only |
| `src/actions/sync.ts` | Manual sync operations | Manual sync page, initial setup |
| `src/lib/realtime-sync.ts` | Real-time listener | Root layout (auto-initialized) |
| `src/app/api/sync/route.ts` | Sync endpoint | Real-time listener |

---

## Implementation Checklist

### For New Features

When adding new data collections or operations:

- [ ] ✅ Create server actions in `src/actions/appwrite.ts`
- [ ] ✅ Add real-time listener in `src/lib/realtime-sync.ts`
- [ ] ✅ Add sync handler in `src/app/api/sync/route.ts`
- [ ] ✅ Add Firebase sync functions in `src/actions/firebase.ts`
- [ ] ✅ Add fallback fetch in `src/actions/data-fetcher.ts`
- [ ] ✅ Use Appwrite actions in UI components
- [ ] ❌ NEVER call Firebase functions directly from UI

### For Maintenance

- [ ] ✅ All UI forms use `createItem()`, `updateItem()`, `deleteItem()`
- [ ] ✅ Real-time sync is running (check dev indicator)
- [ ] ✅ No direct Firebase writes from admin pages
- [ ] ✅ Images go to Firebase Storage, URLs to Appwrite
- [ ] ✅ Data reads use smart fallback (data-fetcher)

---

## Common Scenarios

### Creating a New Event

```typescript
// ✅ CORRECT PATTERN
import { createItem } from '@/actions/appwrite';
import { uploadEventImage } from '@/actions/storage';

async function createNewEvent(eventData, imageFile) {
    // 1. Upload image to Firebase Storage
    const { url: imageUrl } = await uploadEventImage(imageFile, eventId);
    
    // 2. Create event in Appwrite with image URL
    const result = await createItem('events', {
        ...eventData,
        imageUrl  // Store CDN URL
    });
    
    // 3. Real-time sync automatically copies to Firebase Firestore
    // (Happens automatically via listener)
}
```

### Updating User Data

```typescript
// ✅ CORRECT PATTERN
import { updateItem } from '@/actions/appwrite';

async function updateUser(userId, userData) {
    // Update in Appwrite
    const result = await updateItem('users', userId, userData);
    
    // Firebase automatically synced via real-time listener
}
```

### Bulk Import Events

```typescript
// ✅ CORRECT PATTERN
import { createManyItems } from '@/actions/appwrite';

async function bulkImportEvents(eventsArray) {
    // Create all events in Appwrite
    const result = await createManyItems('events', eventsArray);
    
    // Real-time sync handles Firebase updates automatically
}
```

### Deleting Data

```typescript
// ✅ CORRECT PATTERN
import { deleteItem } from '@/actions/appwrite';

async function deleteEvent(eventId) {
    // Delete from Appwrite
    const result = await deleteItem('events', eventId);
    
    // Real-time listener automatically:
    // 1. Detects deletion in Appwrite
    // 2. Calls /api/sync with action='delete'
    // 3. Removes document from Firebase Firestore
    // 4. Both databases stay synchronized
}
```

**Delete Flow:**
```
Admin UI (Delete Button)
    ↓
deleteItem('events', id)  [Appwrite]
    ↓
Appwrite Document Deleted
    ↓
Real-time Listener Detects Delete Event
    ↓
POST /api/sync { type: 'events', action: 'delete', id }
    ↓
deleteFirestoreEvent(id)  [Firebase]
    ↓
Firebase Document Deleted
    ↓
✅ Both Databases Synchronized
```

**Supported Delete Operations:**
- ✅ Users: `deleteItem('users', userId)` → Deletes from both DBs
- ✅ Events: `deleteItem('events', eventId)` → Deletes from both DBs
- ✅ Tickets: `deleteItem('tickets', ticketId)` → Deletes from both DBs
- ✅ Attendance: `deleteItem('attendance', attendanceId)` → Deletes from both DBs
- ✅ Transactions: Automatically synced on delete

---

## Troubleshooting

### Database Out of Sync

**Symptoms:**
- Data in Appwrite but not in Firebase
- Data in Firebase but not in Appwrite

**Solutions:**
1. Check if real-time sync is running (dev indicator)
2. Run manual sync: Navigate to `/dashboard/sync`
3. Check browser console for sync errors
4. Verify Appwrite WebSocket connection

### Data Not Showing in UI

**Check:**
1. Is data in Appwrite? (Check Appwrite console)
2. Is fallback working? (Check data-fetcher source indicator)
3. Are you using correct fetch functions?

### Sync Delays

**Normal:**
- Real-time sync: < 1 second
- If delayed, check network/WebSocket connection

---

## Key Principles Summary

1. **Primary Source:** Appwrite is always the source of truth
2. **Write Flow:** Admin → Appwrite → Auto-sync → Firebase
3. **Read Flow:** Try Appwrite first, fallback to Firebase
4. **Images:** Upload to Firebase Storage, store URLs in Appwrite
5. **Never:** Write directly to Firebase from admin UI
6. **Auto-sync:** Real-time listener keeps databases synchronized
7. **Fallback:** Firebase provides high availability when Appwrite down

---

## Benefits of This Architecture

✅ **High Availability:** Firebase fallback ensures uptime  
✅ **Data Consistency:** Single write path prevents conflicts  
✅ **Performance:** CDN-backed image delivery  
✅ **Real-time:** Changes sync instantly  
✅ **Scalability:** Both databases scale automatically  
✅ **Maintainability:** Clear separation of concerns  
✅ **Reliability:** Backup data in Firebase  

---

## Questions?

Refer to these documentation files:
- [README.md](./README.md) - Getting started
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - Complete project overview
- [DATA_FETCHING_STRATEGY.md](./DATA_FETCHING_STRATEGY.md) - Read operations
- [STORAGE_STRATEGY.md](./STORAGE_STRATEGY.md) - Image handling
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase configuration

**Remember:** When in doubt, use Appwrite actions for writes, data-fetcher for reads!
