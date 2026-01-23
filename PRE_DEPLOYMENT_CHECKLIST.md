# 🚀 PRE-DEPLOYMENT CHECKLIST

## ✅ Videos Work Like kenxokent Account - All Users Follow Same Pattern

### The Working System (kenxokent Account)
- ✅ Uses `posts` table for database storage
- ✅ Uses presigned URLs for uploads via `/api/upload-url`
- ✅ Creates post records via `/api/create-post`
- ✅ Videos persist after refresh
- ✅ All users can see all public videos

### Verification Steps

#### 1. Database Setup ✅
Run [`FIX_VIDEO_PERSISTENCE.sql`](FIX_VIDEO_PERSISTENCE.sql ) in Supabase SQL Editor:
```bash
# This SQL script sets up:
# - posts table (same as kenxokent uses)
# - RLS policies for public visibility
# - Storage policies for videos bucket
# - profiles table with proper relationships
# - Optimized indexes for performance
```

**How to Run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `FIX_VIDEO_PERSISTENCE.sql`
3. Paste and click **Run**
4. Verify output shows 4 counts (Posts, Profiles, Policies, Storage)

#### 2. Code Verification ✅

**Upload Flow - ALL users use the same path:**
- [`components/Upload.tsx`](components/Upload.tsx ) → calls `uploadVideoAndCreatePost()`
- [`services/postUploadService.ts`](services/postUploadService.ts ) → uses presigned URLs
- [`api/upload-url.ts`](api/upload-url.ts ) → generates presigned URL
- [`api/create-post.ts`](api/create-post.ts ) → saves to `posts` table

**Fetch Flow - ALL users read from the same table:**
- [`components/PostsFeed.tsx`](components/PostsFeed.tsx ) → displays videos
- [`services/backend.ts`](services/backend.ts ) → `getFeed()` queries `posts` table
- Query: `from("posts").eq('visibility', 'public')`

#### 3. Environment Variables Check

Verify these are set in **Vercel Dashboard → Project Settings → Environment Variables:**

```bash
VITE_SUPABASE_URL=https://mlgxgylvndtvyqrdfvlw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Where to find these:**
- Supabase Dashboard → Project Settings → API
- Copy: `Project URL`, `anon public`, `service_role secret`

#### 4. Storage Bucket Verification

Go to Supabase Dashboard → Storage:
- Bucket name: `videos`
- Should be **PUBLIC** (not private)
- Check policies are applied (from SQL script)

#### 5. Test the Complete Flow

**Test 1: Upload & Persistence**
```bash
1. Log in as ANY user (not kenxokent)
2. Upload a test video
3. Wait for upload to complete
4. Refresh the page (F5 or Cmd+R)
5. ✅ Video should still appear in feed
```

**Test 2: Cross-User Visibility**
```bash
1. Log in as User A
2. Upload a video
3. Log out
4. Log in as User B
5. ✅ User A's video should appear in feed
```

**Test 3: Anonymous Access**
```bash
1. Open app in incognito/private browser
2. Don't log in
3. ✅ All public videos should be visible
```

### Common Issues & Fixes

#### Issue: Videos don't persist after refresh
**Fix:** Run `FIX_VIDEO_PERSISTENCE.sql` in Supabase

#### Issue: Videos upload but don't appear in feed
**Causes:**
- RLS policies not set correctly
- Storage bucket is private instead of public
- Frontend querying wrong table

**Fix:**
```sql
-- Check if posts exist:
SELECT COUNT(*) FROM posts WHERE visibility = 'public';

-- Check RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'posts';

-- Should show 4 policies:
-- 1. everyone_can_view_public_posts
-- 2. authenticated_users_can_create_posts
-- 3. users_can_update_own_posts
-- 4. users_can_delete_own_posts
```

#### Issue: Upload fails with "No presigned URL"
**Fix:** Check API endpoint is deployed:
- Verify `/api/upload-url.ts` exists in Vercel
- Check environment variables are set
- Test endpoint: `curl https://your-app.vercel.app/api/upload-url`

### Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    ALL USERS                        │
│         (kenxokent + everyone else)                 │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Upload.tsx Component                   │
│   uploadVideoAndCreatePost(file, params)            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│         postUploadService.ts                        │
│  1. GET /api/upload-url (presigned URL)             │
│  2. Upload video to presigned URL                   │
│  3. POST /api/create-post (save to DB)              │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Supabase Storage                       │
│         bucket: "videos" (PUBLIC)                   │
│    path: userId/videoId.mp4                         │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│            Supabase Database                        │
│           table: "posts"                            │
│  - id, user_id, video_path                          │
│  - visibility = 'public'                            │
│  - RLS: everyone can view public                    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           PostsFeed.tsx Component                   │
│    backend.content.getFeed()                        │
│    → queries posts table                            │
│    → shows ALL public videos                        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              ALL USERS SEE VIDEO                    │
│         (even after page refresh!)                  │
└─────────────────────────────────────────────────────┘
```

### Deployment Command

```bash
# After verifying everything above:
git add .
git commit -m "✅ Standardize all uploads on posts table (kenxokent pattern)"
git push origin main

# Vercel will auto-deploy
# Monitor: https://vercel.com/dashboard
```

### Post-Deployment Verification

After deployment completes:
1. Visit your app URL
2. Upload a test video
3. Refresh page → ✅ Video persists
4. Open in another browser → ✅ Video visible
5. Check Supabase Dashboard → Table Editor → posts → ✅ New row exists

## 🎉 Success Criteria

- ✅ All uploads save to `posts` table
- ✅ All users follow the same upload flow (kenxokent pattern)
- ✅ Videos persist after page refresh
- ✅ Videos visible to all users (public feed)
- ✅ Anonymous users can view public videos
- ✅ No errors in browser console during upload
- ✅ No 401/403 errors from Supabase

---

**Ready to deploy? All checkboxes above should be ✅**
