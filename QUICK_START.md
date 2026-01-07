# Quick Start Guide

## ⚡ Get Real-Time Sync Running in 5 Minutes

### 1. Update Environment Variables

Edit your `.env.local` file:

```env
# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password

# Firebase (from your Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA4d3AYDyh5gyWX4XcK0e93O4jXshPvaPY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=brahma-a4d01.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=brahma-a4d01
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=brahma-a4d01.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=533261417684
NEXT_PUBLIC_FIREBASE_APP_ID=1:533261417684:web:d174fe6e43c3bfe5e7cf41

# Appwrite (your existing values)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
APPWRITE_API_KEY=your_api_key
```

**Important:** Remove any `NEXT_PUBLIC_FIREBASE_DATABASE_URL` line if you have one (not needed for Firestore).

### 2. Install Dependencies (if not already done)

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Login to Dashboard

1. Go to `http://localhost:3000`
2. Login with your admin credentials
3. You'll see a green "Real-time Sync Active" indicator in the bottom-right

### 5. Initial Sync (One-Time)

1. Navigate to `/dashboard/sync`
2. Click **"Sync All Data"**
3. Wait for completion (syncs all existing Appwrite data to Firebase)

### 6. Test Real-Time Sync

**Option A: Via Appwrite Console**
1. Go to your Appwrite Console
2. Create a new user/event/ticket
3. Check browser console - you'll see sync logs
4. Verify in Firebase Console

**Option B: Via Your App**
1. Create a record through your existing dashboard
2. It's saved to Appwrite
3. Real-time sync automatically copies to Firebase
4. Check browser console for confirmation

## 🎯 What Happens Now?

### Automatic (Real-Time) Sync
- ✅ Any CREATE in Appwrite → Instantly copied to Firebase
- ✅ Any UPDATE in Appwrite → Instantly updated in Firebase  
- ✅ Any DELETE in Appwrite → Instantly deleted from Firebase
- ✅ Works for: Users, Events, Tickets, Attendance

### Manual Sync (When Needed)
- Use `/dashboard/sync` for bulk operations
- Useful for initial migration
- Prevents duplicates automatically

## 📊 Monitor Sync Activity

### Browser Console
Open DevTools Console (F12) to see:
```
🔥 Real-time Appwrite → Firebase sync active
👤 User event: create
✅ User synced to Firebase: user123
```

### Firebase Console
https://console.firebase.google.com/project/brahma-a4d01/firestore
- Check Firestore collections: `users`, `events`, `tickets`
- Verify data is syncing

### Appwrite Console
Your Appwrite dashboard - source of truth

## 🔧 Troubleshooting

### "Real-time sync not working"
1. Check browser console for errors
2. Verify all environment variables in `.env.local`
3. Restart dev server: `npm run dev`

### "Duplicate data"
- Run manual sync only once
- Real-time sync handles ongoing changes
- Duplicates are automatically prevented by `appwriteId`

### "Firebase errors"
1. Verify Firebase project ID matches `.env.local`
2. Check Firebase Console → Firestore is enabled
3. Ensure API key is correct

## 📚 Learn More

- **Full Setup:** See `REALTIME_SYNC_SETUP.md`
- **Firebase Setup:** See `FIREBASE_SETUP.md`
- **Integration Guide:** See `FIREBASE_INTEGRATION_SUMMARY.md`

## ✅ Success Checklist

- [ ] Updated `.env.local` with Firebase config
- [ ] Ran `npm install`
- [ ] Started dev server (`npm run dev`)
- [ ] Logged into dashboard
- [ ] Ran initial sync at `/dashboard/sync`
- [ ] Tested by creating a record in Appwrite
- [ ] Verified sync logs in browser console
- [ ] Checked data in Firebase Console

## 🎉 You're Done!

Your Appwrite data now automatically syncs to Firebase in real-time. No more manual updates needed!

**Next Steps:**
- Integrate Firebase data into your existing pages
- Use Firebase queries for advanced filtering
- Monitor usage in Firebase Console

