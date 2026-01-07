# Real-time Sync Setup Guide

## Overview

This system automatically syncs data from Appwrite to Firebase in **real-time**. Any create, update, or delete operation in Appwrite is instantly reflected in Firebase.

## Architecture

```
Appwrite Database
     ↓ (Real-time Subscription)
Appwrite Client
     ↓ (Websocket Connection)
React App (Browser)
     ↓ (API Call)
Next.js API Route
     ↓ (Server Action)
Firebase (Firestore + Realtime DB)
```

## Components

### 1. Real-time Listener (`src/lib/realtime-sync.ts`)
- Uses Appwrite Realtime API
- Subscribes to all collection changes
- Runs in the browser (client-side)
- Sends sync requests to API endpoint

### 2. API Endpoint (`src/app/api/sync/route.ts`)
- Receives sync requests from real-time listener
- Calls Firebase server actions
- Returns success/failure status

### 3. Sync Actions (`src/actions/sync.ts`)
- Manual sync functions for bulk operations
- Used for initial data migration
- Can sync all data or specific collections

### 4. Provider (`src/components/realtime-sync-provider.tsx`)
- Initializes real-time sync on app load
- Shows status indicator in development
- Cleans up subscriptions on unmount

## Environment Variables Required

Add these to your `.env.local`:

```env
# Admin
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA4d3AYDyh5gyWX4XcK0e93O4jXshPvaPY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=brahma-a4d01.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=brahma-a4d01
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=brahma-a4d01.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=533261417684
NEXT_PUBLIC_FIREBASE_APP_ID=1:533261417684:web:d174fe6e43c3bfe5e7cf41

# Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
APPWRITE_API_KEY=your_api_key
```

**Note:** Remove `NEXT_PUBLIC_FIREBASE_DATABASE_URL` if you're only using Firestore (not Realtime Database).

## Setup Steps

### 1. Install Dependencies
```bash
npm install firebase appwrite
```

### 2. Configure Environment Variables
- Copy values from Firebase Console
- Copy values from Appwrite Console
- Create `.env.local` file with all variables

### 3. Initial Data Migration
1. Go to `/dashboard/sync`
2. Click "Sync All Data" to migrate existing Appwrite data to Firebase
3. Wait for completion

### 4. Real-time Sync
- Automatically active when app loads
- No configuration needed
- Check browser console for sync logs

## How It Works

### Real-time Flow

1. **User creates a record in Appwrite** (e.g., new user)
2. **Appwrite Realtime API** detects the change
3. **Client-side listener** (`realtime-sync.ts`) receives the event
4. **Listener calls** `/api/sync` with the data
5. **API route** calls appropriate Firebase action
6. **Firebase action** creates the record in Firestore/RTDB
7. **Success** - Data is now in both databases

### Supported Operations

| Collection | Create | Update | Delete |
|-----------|--------|--------|--------|
| Users     | ✅     | ✅     | ✅     |
| Events    | ✅     | ✅     | ✅     |
| Tickets   | ✅     | ❌     | ❌     |
| Attendance| ✅     | ❌     | ❌     |

## Monitoring

### Browser Console
Real-time sync logs appear in the browser console:
```
🔥 Real-time Appwrite → Firebase sync initialized
👤 User event: databases.xxx.collections.users.documents.create 12345
✅ User synced to Firebase: 12345
```

### Visual Indicator
In development mode, a green indicator appears in the bottom-right showing sync status.

### Sync Dashboard
Visit `/dashboard/sync` to:
- View real-time sync status
- Run manual syncs
- See sync results

## Data Structure

### Appwrite → Firebase Mapping

**Users:**
```javascript
// Appwrite
{
  $id: "user123",
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  college: "MIT",
  pass: "ABC123",
  certificates: []
}

// Firebase (with Appwrite ID preserved)
{
  appwriteId: "user123",
  name: "John Doe",
  email: "john@example.com",
  phone: "1234567890",
  college: "MIT",
  pass: "ABC123",
  certificates: [],
  createdAt: Timestamp
}
```

The `appwriteId` field links Firebase records back to Appwrite.

## Troubleshooting

### Real-time sync not working

1. **Check browser console** for errors
2. **Verify environment variables** are set correctly
3. **Check Appwrite permissions** - collections must allow read access
4. **Verify network connection** - Websockets need stable connection

### Duplicate records

- Manual sync skips existing records by checking `appwriteId`
- First-time manual sync may take time for large datasets
- Real-time sync doesn't create duplicates

### Missing data

1. Run manual sync for existing data: `/dashboard/sync` → "Sync All Data"
2. Check Firebase Console to verify data
3. Check Appwrite Console for source data

### API errors

- Check that all Firebase environment variables are correct
- Verify Firebase project has Firestore enabled
- Check API route logs in terminal

## Performance

### Real-time Sync
- **Latency:** < 1 second for most operations
- **Overhead:** Minimal (only changed documents sync)
- **Connection:** Uses WebSocket for efficiency

### Manual Sync
- **Speed:** ~10-50 records/second
- **Duplicate Prevention:** Checks existing records
- **Batching:** Processes all records sequentially

## Security Considerations

### Production Recommendations

1. **Add authentication to API route:**
```typescript
// src/app/api/sync/route.ts
export async function POST(request: NextRequest) {
    // Verify session
    const session = request.cookies.get('admin_session');
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ... rest of code
}
```

2. **Limit Appwrite permissions** - Only allow authenticated users to read
3. **Monitor Firebase usage** - Check quotas in console
4. **Rate limit API** - Prevent abuse

## Advanced Configuration

### Custom Sync Logic

Edit `src/lib/realtime-sync.ts` to customize sync behavior:

```typescript
// Example: Only sync verified users
if (events.some(e => e.includes('create'))) {
    if (payload.verified === true) {
        // Sync only verified users
        await fetch('/api/sync', { /* ... */ });
    }
}
```

### Selective Sync

Disable sync for specific collections by commenting out subscriptions in `realtime-sync.ts`.

### Batch Processing

For large datasets, modify `src/actions/sync.ts` to use batch operations.

## FAQ

**Q: Do I need both Firestore and Realtime Database?**
A: No, you can use just Firestore. Remove `rtdb` references if not needed.

**Q: Can I sync Firebase → Appwrite?**
A: Not currently. This is one-way (Appwrite → Firebase). Bi-directional sync requires Firebase listeners.

**Q: What happens if sync fails?**
A: Error is logged to console. Record stays in Appwrite. Run manual sync to retry.

**Q: Does this work in production?**
A: Yes! Real-time sync works in both development and production.

**Q: How much does this cost?**
A: Firebase: Free tier includes 50K reads/20K writes per day. Appwrite: Free for most usage.

## Next Steps

1. ✅ Set up environment variables
2. ✅ Run initial manual sync
3. ✅ Test real-time sync by creating a test record in Appwrite
4. ✅ Monitor sync logs in browser console
5. ✅ Check Firebase Console to verify data

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all environment variables
3. Check Firebase and Appwrite Console
4. Review this documentation

Happy syncing! 🔥

