# Firebase Setup Guide

## Prerequisites
- A Firebase account (https://firebase.google.com/)
- A Firebase project created

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select existing project
3. Follow the setup wizard

### 2. Enable Firestore Database
1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** or **Test mode** (for development)
4. Select a Cloud Firestore location
5. Click "Enable"

### 3. Enable Realtime Database
1. In Firebase Console, go to **Build** → **Realtime Database**
2. Click "Create Database"
3. Choose **Test mode** for development (or **Locked mode** for production)
4. Click "Enable"

### 4. Get Firebase Configuration
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register your app (give it a nickname)
5. Copy the configuration values

### 5. Configure Environment Variables
1. Create a `.env.local` file in the root directory
2. Copy the contents from `firebase-env-example.txt`
3. Replace the placeholder values with your Firebase config:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

### 6. Set Up Firestore Collections (Optional)
Create these collections in Firestore if you want to pre-structure your database:
- `users`
- `events`
- `tickets`
- `attendance`

### 7. Set Up Realtime Database Structure (Optional)
Create these nodes in Realtime Database:
```json
{
  "users": {},
  "events": {},
  "tickets": {},
  "attendance": {}
}
```

### 8. Configure Security Rules

#### Firestore Rules (Basic - Update for Production)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Realtime Database Rules (Basic - Update for Production)
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**Note:** These are permissive rules for development. Update them for production security.

## Usage in Your Application

### Import Firebase instances:
```typescript
import { db, rtdb } from '@/lib/firebase';
```

### Use Firebase actions:
```typescript
import { 
  getFirestoreUsers, 
  createFirestoreUser,
  getRTDBUsers,
  createRTDBEvent
} from '@/actions/firebase';
```

### Example: Fetch Firestore users
```typescript
const { users, total } = await getFirestoreUsers();
```

### Example: Create user in Realtime Database
```typescript
const result = await createRTDBUser({
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Available Functions

### Firestore Operations
- `getFirestoreUsers()` - Get all users
- `getFirestoreUser(userId)` - Get single user
- `createFirestoreUser(userData)` - Create user
- `updateFirestoreUser(userId, userData)` - Update user
- `deleteFirestoreUser(userId)` - Delete user
- `getFirestoreEvents()` - Get all events
- `createFirestoreEvent(eventData)` - Create event
- `updateFirestoreEvent(eventId, eventData)` - Update event
- `deleteFirestoreEvent(eventId)` - Delete event
- `getFirestoreTickets()` - Get all tickets
- `createFirestoreTicket(ticketData)` - Create ticket

### Realtime Database Operations
- `getRTDBUsers()` - Get all users
- `createRTDBUser(userData)` - Create user
- `updateRTDBUser(userId, userData)` - Update user
- `deleteRTDBUser(userId)` - Delete user
- `getRTDBEvents()` - Get all events
- `createRTDBEvent(eventData)` - Create event
- `getRTDBAttendance()` - Get all attendance records
- `createRTDBAttendance(attendanceData)` - Create attendance record

## Choosing Between Firestore and Realtime Database

### Use Firestore when:
- You need complex queries and indexing
- You want automatic offline support
- Your data is structured in collections and documents
- You need better scalability for reads

### Use Realtime Database when:
- You need real-time synchronization
- Your data is simple and hierarchical
- You need low latency
- You're building presence systems or real-time collaboration

## Next Steps
- Update security rules for production
- Set up Firebase Authentication (if needed)
- Configure indexes for Firestore queries
- Monitor usage in Firebase Console

