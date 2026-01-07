# Brahma Admin Dashboard

Admin operations dashboard for Brahma Ashwamedha built with Next.js, Firebase, and Appwrite.

## Features

- 🔐 **Authentication** - Secure admin login system
- 👥 **User Management** - Manage users with full CRUD operations
- 🎫 **Ticket System** - Track and manage event tickets
- 📅 **Events Management** - Create and manage events
- ✅ **Attendance Tracking** - Monitor event attendance
- 🔥 **Firebase Integration** - Firestore & Realtime Database support
- ☁️ **Appwrite Backend** - Alternative backend support

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
│   ├── actions/          # Server actions
│   │   ├── auth.ts       # Authentication logic
│   │   ├── firebase.ts   # Firebase operations
│   │   └── appwrite.ts   # Appwrite operations
│   ├── app/              # Next.js app router pages
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── login/        # Login page
│   │   └── page.tsx      # Home page
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Utility libraries
│   │   ├── firebase.ts   # Firebase configuration
│   │   ├── appwrite.ts   # Appwrite configuration
│   │   └── utils.ts      # Helper functions
│   └── middleware.ts     # Auth middleware
├── public/               # Static assets
└── FIREBASE_SETUP.md     # Firebase setup guide
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

## Firebase Setup

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Options

This project supports both Firebase and Appwrite:

### Firebase
- **Firestore** - Document database for structured data
- **Realtime Database** - Real-time synchronization for live data

### Appwrite
- Alternative backend option
- Already configured in the project

Import Firebase functions:
```typescript
import { getFirestoreUsers, createRTDBEvent } from '@/actions/firebase';
```

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
