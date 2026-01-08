# Sync Troubleshooting Guide

## ✅ Fixed Issues

### 1. Missing Environment Variable
**Problem:** `NEXT_PUBLIC_APPWRITE_DATABASE_ID` was not exposed to the client-side code.

**Solution:** Added `NEXT_PUBLIC_APPWRITE_DATABASE_ID=6948d5240015a19ea05a` to `.env.local`

**Why this matters:** The real-time sync listener runs on the client-side and needs this variable to subscribe to the correct Appwrite database.

---

## 🔍 How to Verify Sync is Working

### Step 1: Restart Development Server

After adding the environment variable, you MUST restart the dev server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Check Browser Console

Open browser console (F12) and look for these messages:

**On Page Load:**
```
🔥 Real-time Appwrite → Firebase sync initialized
🔥 Real-time Appwrite → Firebase sync active
```

**When Creating an Event:**
```
📅 Event event: databases.6948d5240015a19ea05a.collections.events.documents.xxx.create {eventId}
✅ Event synced to Firebase: {eventId} created
   📊 Data: { event_name: "Test Event", date: "2026-01-15" }
```

**When Creating a User:**
```
👤 User event: databases.6948d5240015a19ea05a.collections.users.documents.xxx.create {userId}
✅ User synced to Firebase: {userId} created
   📊 Data: { name: "John Doe", email: "john@example.com" }
```

### Step 3: Verify in Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: `brahma-a4d01`
3. Navigate to Firestore Database
4. Check collections: `events`, `users`, `tickets`, etc.
5. Verify documents exist with same IDs as Appwrite

---

## 🐛 Common Issues & Solutions

### Issue 1: "Real-time sync not initialized"
**Symptoms:** No sync messages in console

**Solutions:**
1. Check if `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is set in `.env.local`
2. Restart dev server after adding env variable
3. Hard refresh browser (Ctrl+Shift+R)
4. Check if `<RealtimeSyncProvider />` is in `app/layout.tsx`

### Issue 2: "Failed to sync to Firebase"
**Symptoms:** See error message: `❌ Failed to sync event to Firebase`

**Solutions:**
1. Check Firebase configuration in `.env.local`
2. Verify Firebase rules allow writes
3. Check network tab for failed `/api/sync` requests
4. Look at detailed error in console

### Issue 3: "Sync happens but data not in Firebase"
**Symptoms:** Success message shown but data missing in Firebase

**Solutions:**
1. Check Firebase console for the specific document ID
2. Verify Firestore rules are not blocking writes
3. Check `/api/sync` endpoint logs in terminal
4. Verify Firebase credentials are correct

---

## 🔧 Manual Sync Test

To manually test if sync is working, run this in browser console:

```javascript
// Test sync manually
fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        type: 'events',
        action: 'create',
        data: {
            appwriteId: 'test-event-123',
            event_id: 'test-event-123',
            event_name: 'Test Event',
            fest: 'BRAHMA',
            date: '2026-01-15',
            description: 'Test description'
        }
    })
})
.then(r => r.json())
.then(console.log);
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "id": "test-event-123",
    "firebaseId": "test-event-123",
    "success": true,
    "action": "created"
  },
  "action": "created"
}
```

---

## 📋 Checklist

Before reporting an issue, verify:

- [ ] ✅ `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is in `.env.local`
- [ ] ✅ Dev server was restarted after env change
- [ ] ✅ Browser was hard refreshed (Ctrl+Shift+R)
- [ ] ✅ See "Real-time sync active" indicator in bottom-right
- [ ] ✅ Firebase credentials are correct
- [ ] ✅ Firestore rules allow writes
- [ ] ✅ Network tab shows successful `/api/sync` requests

---

## 🎯 Testing Workflow

### Test 1: Create Single Event
```
1. Go to /dashboard/events
2. Click "Add Event"
3. Fill form: 
   - Event Name: "Test Event"
   - Date: "2026-01-15"
   - Fest: "BRAHMA"
4. Click Save
5. Check console for: ✅ Event synced to Firebase
6. Go to Firebase Console → Firestore → events collection
7. Verify event exists with correct data
```

### Test 2: Create User
```
1. Go to /dashboard/users
2. Click "Add User"
3. Fill form with test data
4. Click Save
5. Check console for: ✅ User synced to Firebase
6. Go to Firebase Console → Firestore → users collection
7. Verify user exists
```

### Test 3: Bulk Upload Events
```
1. Create CSV with 3 test events
2. Upload CSV in events page
3. Check console for 3x: ✅ Event synced to Firebase
4. Go to Firebase Console
5. Verify all 3 events exist
```

### Test 4: Delete Event
```
1. Delete any event from UI
2. Check console for: ✅ Event deleted from Firebase
3. Verify event removed from both Appwrite and Firebase
```

---

## 📞 Enhanced Logging

The sync now includes detailed logging:

**Before (old):**
```
✅ Event synced to Firebase: abc123
```

**After (new):**
```
✅ Event synced to Firebase: abc123 created
   📊 Data: { event_name: "Tech Conference", date: "2026-03-15" }
```

This helps identify:
- Whether sync is actually working
- What data is being synced
- If the operation was create/update

---

## 🚀 Next Steps After Fixing

1. **Restart your dev server** - This is critical!
2. **Clear browser cache** - Or do hard refresh
3. **Test create operation** - Add one event
4. **Check console logs** - Look for success messages
5. **Verify in Firebase** - Check Firestore database
6. **Test bulk upload** - If single works, test CSV
7. **Test delete** - Verify deletion syncs too

---

## 💡 Pro Tips

1. **Keep browser console open** while testing
2. **Use Firebase Console in split screen** to see real-time updates
3. **Check Network tab** if sync fails - look for `/api/sync` requests
4. **Check terminal logs** - Server-side logs appear there
5. **Use unique event names** when testing to avoid confusion

---

## ✅ Success Indicators

You'll know sync is working when you see:

- ✅ Green "Real-time Sync Active" badge in bottom-right corner
- ✅ Console logs for every create/update/delete operation
- ✅ Data appears in Firebase immediately after Appwrite creation
- ✅ Both databases have identical data (same IDs)
- ✅ Deletions remove from both databases

---

## 🆘 Still Having Issues?

If sync still doesn't work after:
1. Adding `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
2. Restarting dev server
3. Hard refreshing browser
4. Checking all checklist items

Then check:
- Firebase security rules (might be blocking writes)
- Network firewall (might be blocking requests)
- Browser console errors (might show specific issues)
- Terminal logs (server-side errors appear here)
