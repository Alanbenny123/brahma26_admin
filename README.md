# Brahma Admin Dashboard

Admin operations dashboard for Brahma Ashwamedha built with Next.js, Firebase, and Appwrite.

## Features

- 🔐 **Authentication** - Secure admin login system
- 👥 **User Management** - Manage users with full CRUD operations
- 🎫 **Ticket System** - Track and manage event tickets
- 📅 **Events Management** - Create and manage events
- ✅ **Attendance Tracking** - Monitor event attendance
- 🔥 **Firebase Integration** - Firestore & Realtime Database support
- 📦 **Firebase Storage** - Direct image storage with CDN delivery
- ☁️ **Appwrite Backend** - Alternative backend support
- 🔄 **Real-time Sync** - Auto-sync from Appwrite to Firebase

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Firebase (Firestore + Realtime Database) & Appwrite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 20+ installed
- Firebase account and project
- Appwrite account (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Alanbenny123/brahma26_admin.git
cd brahma26_admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `firebase-env-example.txt` to `.env.local`
   - Fill in your Firebase configuration values
   - Add your admin credentials

4. Configure Firebase (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
brahma26-admin/
├── src/
│   ├── actions/              # Server actions
│   │   ├── auth.ts           # Authentication logic
│   │   ├── firebase.ts       # Firebase operations
│   │   ├── storage.ts        # Firebase Storage operations
│   │   ├── appwrite.ts       # Appwrite operations
│   │   └── sync.ts           # Sync operations
│   ├── app/                  # Next.js app router pages
│   │   ├── dashboard/        # Dashboard pages
│   │   ├── login/            # Login page
│   │   └── page.tsx          # Home page
│   ├── components/           # React components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── ui/               # Reusable UI components
│   │   └── realtime-sync-provider.tsx # Real-time sync provider
│   ├── lib/                  # Utility libraries
│   │   ├── firebase.ts       # Firebase configuration
│   │   ├── appwrite.ts       # Appwrite configuration
│   │   ├── client-storage.ts # Client-side storage utilities
│   │   ├── realtime-sync.ts  # Real-time sync logic
│   │   └── utils.ts          # Helper functions
│   └── middleware.ts         # Auth middleware
├── public/                   # Static assets
├── FIREBASE_SETUP.md         # Firebase setup guide
└── STORAGE_STRATEGY.md       # Image storage strategy guide
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Admin Authentication
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## Documentation

- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration guide
- **[STORAGE_STRATEGY.md](./STORAGE_STRATEGY.md)** - Image storage strategy (Firebase Storage)
- **[DATA_FETCHING_STRATEGY.md](./DATA_FETCHING_STRATEGY.md)** - Smart data fetching with fallback
- **[REALTIME_SYNC_SETUP.md](./REALTIME_SYNC_SETUP.md)** - Real-time sync technical details
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide for sync

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database & Storage Strategy

### Dual Storage Architecture with Smart Fallback

**Data Fetching Logic:**
1. **Check Appwrite** availability first
2. If available → Fetch from **Appwrite** (primary source)
3. If unavailable → Fetch from **Firebase** (fallback source)
4. Return data + source information for monitoring

**Non-Image Data:**
- Stored in **Appwrite** (primary source of truth)
- Auto-synced to **Firebase Firestore** in real-time
- Fetched with automatic fallback logic

**Image Data:**
- Uploaded directly to **Firebase Storage**
- URLs stored in Appwrite and synced to Firestore

### Why This Strategy?
1. ✅ **High Availability** - Automatic fallback ensures no downtime
2. ✅ **Performance** - Images served via Firebase CDN
3. ✅ **Real-time Sync** - Automatic synchronization from Appwrite to Firebase
4. ✅ **Scalability** - Firebase Storage scales automatically
5. ✅ **Cost Effective** - Pay only for what you use
6. ✅ **Observability** - Always know which source is serving data

### Image Types Supported
- 📜 **Certificates** - User achievement certificates
- 🔲 **QR Codes** - Ticket QR codes for scanning
- 🖼️ **Event Images** - Event banners and posters
- 👤 **Profile Images** - User profile pictures

### Data Fetching Example
```typescript
// Smart fetch with automatic fallback
import { fetchUsers } from '@/actions/data-fetcher';

const { users, total, source } = await fetchUsers();
console.log(`Fetched ${total} users from ${source}`); 
// source: 'appwrite' (primary) or 'firebase' (fallback)

// Use the data - images are already URLs
users.forEach(user => {
    console.log(user.name, user.email);
    user.certificates.forEach(url => {
        // Display certificate image from Firebase Storage
    });
});
```

### Image Upload Example
```typescript
// 1. Upload image to Firebase Storage
import { uploadCertificate } from '@/actions/storage';
const result = await uploadCertificate(file, userId);

// 2. Store data in Appwrite with image URL
await appwriteDatabase.createDocument(
    databaseId, 'users', userId,
    { name: 'John Doe', certificates: [result.url] }
);

// 3. Auto-sync handles the rest!
```

See **[DATA_FETCHING_STRATEGY.md](./DATA_FETCHING_STRATEGY.md)** and **[STORAGE_STRATEGY.md](./STORAGE_STRATEGY.md)** for detailed documentation.

## Authentication Flow

1. User visits root `/` → Redirects to `/login`
2. Login with admin credentials → Redirects to homepage
3. Homepage shows dashboard navigation cards
4. Click card → Navigate to specific dashboard section

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Alanbenny123/brahma26_admin)

Remember to add your environment variables in Vercel project settings.
