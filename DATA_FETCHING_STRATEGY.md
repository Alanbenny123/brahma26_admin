# Data Fetching Strategy

## Overview
This project uses a **smart fallback mechanism** for fetching data:

1. **Primary Source**: Appwrite (always check first)
2. **Fallback Source**: Firebase Firestore (if Appwrite is unavailable)
3. **Image Data**: Always stored in Firebase Storage (URLs only in databases)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Data Fetch Request                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Check Appwrite     │
         │ Availability       │
         └────────┬───────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    Available          Unavailable
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────────┐
│  Fetch from   │   │  Fetch from      │
│  Appwrite     │   │  Firebase        │
│  (Primary)    │   │  (Fallback)      │
└───────┬───────┘   └────────┬─────────┘
        │                    │
        └────────┬───────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Return Data    │
        │ + Source Info  │
        └────────────────┘
```

## Data Types

### Non-Image Data (from Appwrite/Firebase)
- User information (name, email, phone, college, pass)
- Event details (name, description, date, venue)
- Ticket information (user_id, event_id, status, price)
- Transaction records (amount, status, payment_method)
- Attendance records (event_id, user_id, status)

### Image Data (from Firebase Storage)
- User certificates (URLs stored in database)
- Event images (URLs stored in database)
- Ticket QR codes (URLs stored in database)
- Profile images (URLs stored in database)

## Usage

### Basic Fetch

```typescript
import { fetchUsers, fetchEvents, fetchTickets } from '@/actions/data-fetcher';

// Fetch users
const { users, total, source } = await fetchUsers();
console.log(`Fetched ${total} users from ${source}`); // 'appwrite' or 'firebase'

// Fetch events
const { events, total, source } = await fetchEvents();

// Fetch tickets
const { tickets, total, source } = await fetchTickets();
```

### Generic Fetch

```typescript
import { fetchData } from '@/actions/data-fetcher';

const result = await fetchData('users');
// or
const result = await fetchData('events');
```

### Response Structure

```typescript
{
    users: [...],          // Array of user objects
    total: 100,           // Total count
    source: 'appwrite',   // 'appwrite', 'firebase', or 'error'
    success: true,        // boolean
    error?: string        // Only present if success is false
}
```

## Client-Side Example

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [source, setSource] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadUsers() {
            const { fetchUsers } = await import('@/actions/data-fetcher');
            const result = await fetchUsers();
            
            if (result.success) {
                setUsers(result.users);
                setSource(result.source);
            }
            setLoading(false);
        }
        loadUsers();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <p>Data source: {source}</p>
            {users.map(user => (
                <div key={user.id}>
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                    {/* Image URLs are already in the data */}
                    {user.certificates.map((certUrl, i) => (
                        <img key={i} src={certUrl} alt="Certificate" />
                    ))}
                </div>
            ))}
        </div>
    );
}
```

## How It Works

### Step 1: Availability Check
```typescript
async function checkAppwriteAvailable(): Promise<boolean> {
    try {
        const response = await getUsers();
        return response.documents !== undefined;
    } catch (error) {
        return false;
    }
}
```

### Step 2: Conditional Fetch
```typescript
if (isAppwriteAvailable) {
    // Fetch from Appwrite (primary)
    const { documents } = await getUsers();
    return { users: documents, source: 'appwrite' };
} else {
    // Fallback to Firebase
    const { users } = await getFirestoreUsers();
    return { users, source: 'firebase' };
}
```

### Step 3: Data Transformation
```typescript
// Transform Appwrite format to consistent format
const usersWithImages = documents.map((user) => ({
    id: user.$id,
    name: user.name,
    email: user.email,
    // Image URLs (already stored in database)
    certificates: user.certificates || [],
}));
```

## Benefits

### 1. High Availability
- If Appwrite is down, Firebase serves as backup
- No service interruption for end users

### 2. Performance
- Images served via Firebase CDN (fast delivery)
- Non-image data from Appwrite (primary source)

### 3. Consistency
- Data automatically synced from Appwrite to Firebase
- Both databases have the same data

### 4. Flexibility
- Easy to switch between sources
- Can add more fallback sources if needed

### 5. Observability
- Always know which source is serving data
- Easy debugging and monitoring

## Error Handling

```typescript
const result = await fetchUsers();

if (!result.success) {
    console.error('Fetch error:', result.error);
    // Handle error (show message, retry, etc.)
    return;
}

// Use data
const { users, source } = result;
```

## Monitoring

### Check Data Source

```typescript
const { users, source } = await fetchUsers();

if (source === 'firebase') {
    console.warn('⚠️ Using Firebase fallback. Check Appwrite status.');
} else if (source === 'error') {
    console.error('❌ Both sources failed. Critical issue!');
} else {
    console.log('✅ Using Appwrite (primary source)');
}
```

### Display to Admin

```typescript
<div className="status-badge">
    {source === 'appwrite' && '🟢 Primary Source'}
    {source === 'firebase' && '🟡 Fallback Active'}
    {source === 'error' && '🔴 System Error'}
</div>
```

## Migration Path

### Current Setup
- ✅ Appwrite: Primary database
- ✅ Firebase: Backup + Image storage
- ✅ Real-time sync: Appwrite → Firebase

### Future Options

1. **Switch to Firebase Primary**
   ```typescript
   // Just flip the condition
   if (isFirebaseAvailable) {
       // Fetch from Firebase
   } else {
       // Fallback to Appwrite
   }
   ```

2. **Add More Sources**
   ```typescript
   if (isAppwriteAvailable) {
       // Primary
   } else if (isFirebaseAvailable) {
       // First fallback
   } else if (isSupabaseAvailable) {
       // Second fallback
   }
   ```

## Best Practices

### 1. Always Use Data Fetcher
```typescript
// ✅ Good
import { fetchUsers } from '@/actions/data-fetcher';
const { users } = await fetchUsers();

// ❌ Bad - directly calling Appwrite
import { getUsers } from '@/actions/appwrite';
const { documents } = await getUsers();
```

### 2. Check Success Flag
```typescript
const result = await fetchUsers();
if (!result.success) {
    // Handle error
    return;
}
// Use result.users
```

### 3. Display Source Info
```typescript
// Let admins know which source is active
<Badge>{source === 'appwrite' ? 'Live' : 'Backup'}</Badge>
```

### 4. Handle Images Properly
```typescript
// Images are URLs, not files
{user.certificates.map(url => (
    <img src={url} alt="Certificate" />
))}
```

## Troubleshooting

### Both Sources Return Empty Data
- Check database connectivity
- Verify collection names in config
- Check authentication/permissions

### Images Not Loading
- Verify Firebase Storage URLs are correct
- Check Firebase Storage CORS settings
- Ensure URLs are public or properly authenticated

### Always Using Firebase Fallback
- Check Appwrite server status
- Verify Appwrite credentials in `.env.local`
- Check network connectivity to Appwrite

## Summary

**Flow**: Check Appwrite → If available, use it → Otherwise, use Firebase

This strategy ensures:
- ✅ High availability
- ✅ Fast image delivery
- ✅ Consistent data
- ✅ Easy monitoring
- ✅ Graceful degradation

