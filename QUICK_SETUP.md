# 🚀 Quick Setup Guide - Video System

## ⚡ 5-Minute Setup

### Step 1: Create Storage Bucket (2 min)

1. Go to your Supabase Dashboard
2. Click **Storage** in sidebar
3. Click **New Bucket**
4. Enter name: `videos`
5. Select **Private** bucket
6. Click **Create Bucket**

### Step 2: Run SQL Setup (2 min)

1. Go to **SQL Editor** in Supabase
2. Click **New Query**
3. Copy contents of `COMPLETE_VIDEO_SYSTEM_SETUP.sql`
4. Paste and click **Run**
5. Wait for "✅ Setup complete!" message

### Step 3: Enable Realtime (1 min)

1. Go to **Database** → **Replication**
2. Find `videos` table
3. Toggle **Realtime** to ON
4. Click **Save**

---

## ✅ Verification

Run this in SQL Editor to verify everything works:

```sql
-- Should return your tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('videos', 'profiles');

-- Should return 4 policies
SELECT policyname FROM pg_policies WHERE tablename = 'videos';

-- Should return your bucket
SELECT * FROM storage.buckets WHERE id = 'videos';
```

---

## 🎬 Test Upload

1. Start your app: `npm run dev`
2. Login or create account
3. Click **+** button (upload)
4. Choose video file OR click **URL** button
5. Add description
6. Click **POST**

Video should:
- ✅ Upload with progress bar
- ✅ Appear in feed immediately
- ✅ Show on your profile
- ✅ Stay after page refresh
- ✅ Be visible to all users

---

## 🐛 Quick Fixes

### "Failed to create upload URL"
```sql
-- Run this in SQL Editor
DROP POLICY IF EXISTS "authenticated_storage_insert_videos" ON storage.objects;
CREATE POLICY "authenticated_storage_insert_videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos');
```

### "Database save failed"
```sql
-- Run this in SQL Editor
DROP POLICY IF EXISTS "authenticated_insert_videos" ON videos;
CREATE POLICY "authenticated_insert_videos"
ON videos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### "Videos not showing in feed"
```sql
-- Run this in SQL Editor
DROP POLICY IF EXISTS "public_read_videos" ON videos;
CREATE POLICY "public_read_videos"
ON videos FOR SELECT TO public
USING (is_published = true);
```

---

## 📁 Files Changed

### New Files
- ✅ `COMPLETE_VIDEO_SYSTEM_SETUP.sql` - Database setup
- ✅ `hooks/useVideoRealtime.ts` - Real-time subscription hook
- ✅ `VIDEO_SYSTEM_COMPLETE.md` - Full documentation

### Updated Files
- ✅ `services/uploadService.ts` - Added URL download function
- ✅ `components/CameraCapture.tsx` - Added URL upload UI
- ✅ `components/VideoFeed.tsx` - Added real-time updates

---

## 🎯 What You Get

### For Users
- Upload videos from device
- Upload videos from URL
- See all videos in feed
- Real-time updates
- Fast, reliable uploads

### For You
- Production-ready system
- No complex backend code
- Scales automatically
- Built-in security
- Real-time with zero config

---

## 🔗 URLs You Need

Replace `YOUR-PROJECT` with your actual Supabase project ID:

```env
# Add to .env file
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
```

Find these in: **Supabase Dashboard → Settings → API**

---

## ✨ Features Enabled

- ✅ Presigned URL uploads (fast & reliable)
- ✅ Public feed (all users see all videos)
- ✅ Real-time updates (no refresh needed)
- ✅ URL-based uploads (paste video links)
- ✅ Persistent storage (survives refresh)
- ✅ Profile integration (videos show immediately)
- ✅ Progress tracking (see upload status)
- ✅ Error handling (graceful failures)
- ✅ Retry logic (network resilience)
- ✅ Local fallback (offline support)

---

## 🎉 You're Done!

Your video system is now:
- **Fast** - Direct uploads, no proxy
- **Reliable** - Auto-retry, fallback
- **Scalable** - Supabase handles everything
- **Real-time** - Live feed updates
- **Secure** - RLS policies protect data

Start recording! 📹
