# Brahma26 Admin Dashboard

A modern, full-featured admin dashboard for managing the **Brahma Ashwamedha 2026** event system. Built with Next.js 14, Appwrite, and Firebase.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```
### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:
```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
APPWRITE_API_KEY=your_api_key

# Appwrite Collections
NEXT_PUBLIC_APPWRITE_COLLECTION_USERS=your_users_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_EVENTS=your_events_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_TICKETS=your_tickets_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_ATTENDANCE=your_attendance_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_TRANSACTIONS=your_transactions_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_CERTIFICATES=your_certificates_collection_id
NEXT_PUBLIC_APPWRITE_COLLECTION_ADMIN_LOGS=your_admin_logs_collection_id

# Firebase Configuration (for storage & sync)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 3. Run the Development Server
```bash
npm run dev
```

### 4. Open the Dashboard
Navigate to [http://localhost:3000](http://localhost:3000)

---

## ✨ Features

### 👥 User Management
- View all registered users with advanced search and filtering
- Search by name, email, phone, college, or user ID
- Real-time ticket count and transaction tracking
- Edit user profiles and delete accounts
- Export user data

### 🎉 Event Management
- Create, edit, and delete events
- Manage event details (name, date, time, venue, fest)
- Track ticket sales per event
- Duplicate event detection
- Event capacity management

### 🎫 Ticket System
- Issue tickets to users with QR codes
- Bulk ticket issuance
- Cancel/revoke tickets
- Download tickets in multiple formats (PDF, HTML, PNG, CSV)
- Real-time ticket assignment tracking
- Team-based ticketing support

### 📊 Attendance Tracking
- Mark attendance using QR code scanning
- View attendance records by event
- Real-time attendance updates
- Export attendance reports

### 💳 Transaction Management
- View all Razorpay payment transactions
- Search by transaction ID, order ID, or user
- Link transactions to users and tickets
- Track payment status and amounts
- Transaction filtering and export

### 📋 Admin Activity Logging
- Track all admin actions automatically
- View detailed activity logs with timestamps
- Filter logs by admin, action type, or resource
- Audit trail for compliance

### 🏆 Certificate Management
- Generate event certificates
- Track certificate issuance
- Download certificates

### 📈 Analytics & Reports
- Dashboard overview with key metrics
- Event-wise statistics
- Revenue tracking
- User engagement reports

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Modern icon library

### Backend & Database
- **Appwrite** - Primary database and authentication
- **Firebase Firestore** - Backup/sync database
- **Firebase Storage** - Image and file storage

### Payment Integration
- **Razorpay** - Payment gateway integration

### State Management
- React Hooks (useState, useMemo, useCallback)
- Server Actions for data mutations

---

## 📁 Project Structure

```
brahma26_admin/
├── src/
│   ├── actions/           # Server actions for data operations
│   │   ├── appwrite.ts    # Appwrite CRUD operations
│   │   ├── firebase.ts    # Firebase sync operations
│   │   ├── auth.ts        # Authentication logic
│   │   └── ...
│   ├── app/               # Next.js App Router pages
│   │   ├── dashboard/     # Protected dashboard routes
│   │   │   ├── users/
│   │   │   ├── events/
│   │   │   ├── tickets/
│   │   │   ├── transactions/
│   │   │   ├── attendance/
│   │   │   └── ...
│   │   ├── login/         # Authentication page
│   │   └── layout.tsx
│   ├── components/        # Reusable UI components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   └── ui/            # Generic UI components
│   └── lib/               # Utility functions and configurations
│       ├── appwrite.ts    # Appwrite client setup
│       ├── firebase.ts    # Firebase client setup
│       └── utils.ts
├── public/                # Static assets
└── ...
```

---

## 🔐 Authentication

### Default Login
Use the Appwrite console to create your first admin account:

1. Go to your Appwrite Console
2. Navigate to Auth → Users
3. Create a new user with admin privileges
4. Use those credentials to log in

---

## 🔄 Data Architecture

### Primary Database: Appwrite
All admin operations write to Appwrite first. Appwrite is the source of truth.

### Sync to Firebase
A real-time listener automatically syncs Appwrite changes to Firebase Firestore for:
- Backup/redundancy
- Mobile app compatibility
- Fallback reads

### Data Flow
```
Admin Action → Appwrite → Real-time Listener → Firebase Sync
```

**Important:** Never write directly to Firebase from admin operations. Always use Appwrite actions.

---

## 🎨 Features in Detail

### Search & Filtering
- Multi-field search across all data tables
- Dropdown field selection (name, email, phone, college, ID)
- Real-time filtering as you type
- Result count display

### Batch Operations
- Multi-select with checkboxes
- Bulk delete functionality
- Batch exports

### Real-time Updates
- Automatic data refresh after mutations
- Optimistic UI updates
- Success/error notifications

### Export Capabilities
- Export tickets as PDF, HTML, PNG, CSV
- Download user lists
- Export transaction reports

---

## 🚦 Performance Optimizations

- **Parallel Batch Fetching** - Fetch large datasets efficiently
- **Retry Logic** - Exponential backoff for failed requests
- **Query Optimization** - Proper indexing and ordering
- **Connection Reuse** - Persistent Appwrite connections
- **Selective Field Fetching** - Reduce payload sizes

---

## 📝 Development Guidelines

### Adding New Features
1. Create server actions in `src/actions/`
2. Add UI components in `src/components/`
3. Create page routes in `src/app/dashboard/`
4. Update types in component interfaces
5. Test with real data

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use server actions for data mutations
- Keep components small and focused
- Use Tailwind utility classes

---

## 🐛 Troubleshooting

### Common Issues

**"Not authenticated" error**
- Clear browser cache and cookies
- Check Appwrite session validity
- Verify environment variables

**Data not syncing**
- Check Appwrite real-time listener
- Verify Firebase rules
- Check network connectivity

**Slow performance**
- Enable pagination for large datasets
- Use `fetchAll: false` for limited queries
- Check network inspector for bottlenecks

---

## 📄 License

**Brahma Ashwamedha © 2026**  
All rights reserved.

---

## 👨‍💻 Developers

Built with ❤️ for Brahma Ashwamedha 2026

For support or queries, contact the development team.
