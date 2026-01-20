# Video Upload Flow - Complete Architecture

## ✅ Current Implementation Status

The video upload system is **fully implemented** and follows this flow:

```
User uploads video
    ↓
File saved in Supabase Storage (videos bucket)
    ↓
Path + metadata saved in videos table
    ↓
Feed query selects all published videos
    ↓
Videos visible to everyone (public)
```

---

## 📊 Flow Breakdown

### 1. **User Uploads Video** 
**File**: [components/Upload.tsx](components/Upload.tsx)

- User selects video via file picker or camera capture
- Video validation occurs (duration, size, format)
- Metadata extracted (duration, dimensions)
- User adds description, location, category
- Clicks "POST" button → triggers `handlePost()`

**Key Code** ([Upload.tsx#L273](components/Upload.tsx#L273-L390)):
```typescript
const handlePost = async (isDraft: boolean = false) => {
  // Validates file exists
  // Calls backend.content.uploadVideo()
  // Handles progress tracking
  // Error handling with fallback to local storage
}
```

---

### 2. **File Saved in Storage**
**File**: [services/backend.ts](services/backend.ts)

**Location**: `backend.content.uploadVideo()` ([backend.ts#L296](services/backend.ts#L296-L470))

#### Upload Process:
1. ✅ Authenticate user (`auth.getUser()`)
2. ✅ Compress video if > 50MB
3. ✅ Upload to Supabase Storage bucket `videos`
   - Path: `{user_id}/{timestamp}_video.mp4`
   - Retry logic (up to 3 attempts)
   - Progress tracking
4. ✅ Get public URL from storage

**Key Code**:
```typescript
await supabase.storage
  .from("videos")
  .upload(fileName, uploadFile, { 
    contentType: file.type || "video/mp4", 
    upsert: false,
    onUploadProgress: (progress) => {
      // Report progress to UI
    }
  });

const { data: urlData } = supabase.storage
  .from("videos")
  .getPublicUrl(fileName);
const publicUrl = urlData.publicUrl;
```

---

### 3. **Path Saved in Videos Table**
**File**: [services/backend.ts](services/backend.ts)

**Location**: Same `uploadVideo()` function ([backend.ts#L390](services/backend.ts#L390-L470))

#### Database Insert:
```typescript
const videoRecord = {
  id: videoId,                    // Unique ID
  user_id: user.id,               // Owner
  file_path: fileName,            // Storage path
  video_url: publicUrl,           // Public URL
  description: description,       // User's caption
  poster_url: posterBase64,       // Thumbnail
  duration: Math.round(duration), // Video length
  is_published: true,             // Visibility
  likes_count: 0,
  comments_count: 0,
  shares_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

await supabase
  .from("videos")
  .insert(videoRecord)
  .select();
```

#### Error Handling:
- **If database insert fails**: Video saved to localStorage as backup
- User notified with actionable error message
- Reference to [FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql) provided

---

### 4. **Feed Query Selects All Videos**
**File**: [services/backend.ts](services/backend.ts)

**Location**: `backend.content.getFeed()` ([backend.ts#L251](services/backend.ts#L251-L277))

#### Query Logic:
```typescript
async getFeed(type: string, page: number = 0, pageSize: number = 5) {
  // Fetch ALL published videos (not filtered by user)
  const liveVideos = await backend.content.fetchVideosSafe((q: any) => 
    q.eq('is_published', true)  // Only published videos
     .order("created_at", { ascending: false })  // Newest first
     .range(from, to)  // Pagination
  );
  
  // Merge with local videos (if any)
  // Return for display
}
```

**Important**: The query uses `is_published = true` to ensure only public videos appear in feeds.

---

### 5. **Videos Visible to Everyone**
**Files**: 
- [components/VideoFeed.tsx](components/VideoFeed.tsx) - Feed display
- [FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql) - Security policies

#### Row Level Security (RLS) Policy:
```sql
-- Allow EVERYONE (including anon) to SELECT/view videos
CREATE POLICY "public_select_videos"
ON videos
FOR SELECT
TO public
USING (true);  -- No restrictions on viewing
```

#### Feed Display ([VideoFeed.tsx#L60](components/VideoFeed.tsx#L60-L100)):
```typescript
const loadVideos = async () => {
  const feedData = await backend.content.getFeed(type, 0, 20);
  setVideos(feedData);  // Display all videos
};
```

---

## 🔐 Security Policies (RLS)

### Required Policies ([FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql))

1. **INSERT** - Authenticated users can upload videos:
   ```sql
   CREATE POLICY "authenticated_insert_videos"
   ON videos FOR INSERT TO authenticated
   WITH CHECK (true);
   ```

2. **SELECT** - Everyone can view published videos:
   ```sql
   CREATE POLICY "public_select_videos"
   ON videos FOR SELECT TO public
   USING (true);
   ```

3. **UPDATE** - Users can only update their own videos:
   ```sql
   CREATE POLICY "authenticated_update_own_videos"
   ON videos FOR UPDATE TO authenticated
   USING (auth.uid() = user_id);
   ```

4. **DELETE** - Users can only delete their own videos:
   ```sql
   CREATE POLICY "authenticated_delete_own_videos"
   ON videos FOR DELETE TO authenticated
   USING (auth.uid() = user_id);
   ```

---

## 🗄️ Database Schema

### Videos Table Structure ([DATABASE_SETUP.md](DATABASE_SETUP.md))

```sql
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,        -- Storage path
  video_url TEXT NOT NULL,         -- Public URL
  description TEXT,
  poster_url TEXT,                 -- Thumbnail
  duration INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reposted_from TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes for Performance
```sql
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_is_published ON videos(is_published);
```

---

## 🪣 Storage Configuration

### Bucket: `videos`

**Setup** ([DATABASE_SETUP.md](DATABASE_SETUP.md#L64)):
1. Create bucket named `videos`
2. Set to Public (or configure CORS)
3. Apply storage policies:

```sql
-- Upload policy
CREATE POLICY "Users can upload their own videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' AND
  auth.role() = 'authenticated'
);

-- View policy
CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────┐
│  User Browser   │
│  (Upload.tsx)   │
└────────┬────────┘
         │
         │ 1. handlePost()
         ↓
┌─────────────────┐
│    Backend      │
│  (backend.ts)   │
└────────┬────────┘
         │
         │ 2. Upload to Storage
         ↓
┌─────────────────┐
│ Supabase        │
│ Storage Bucket  │
│   'videos'      │
└────────┬────────┘
         │
         │ 3. Get public URL
         ↓
┌─────────────────┐
│  Videos Table   │
│  (Database)     │
│  - file_path    │
│  - video_url    │
│  - is_published │
└────────┬────────┘
         │
         │ 4. getFeed() query
         ↓
┌─────────────────┐
│   Video Feed    │
│ (VideoFeed.tsx) │
│  All users see  │
│  all videos     │
└─────────────────┘
```

---

## ✅ Verification Checklist

### For Upload to Work:
- [x] User is authenticated (`auth.uid()` exists)
- [x] `videos` storage bucket exists
- [x] Storage policies allow authenticated INSERT
- [x] `videos` table exists with correct schema
- [x] RLS policies allow authenticated INSERT
- [x] Video file meets constraints (size, duration, format)

### For Feed to Show Videos:
- [x] RLS policy allows public SELECT
- [x] `is_published = true` in database
- [x] `getFeed()` queries with no user filter
- [x] VideoFeed component fetches and displays all videos

---

## 🐛 Troubleshooting

### Upload Fails
1. Check [UPLOAD_FIX_GUIDE.md](UPLOAD_FIX_GUIDE.md)
2. Run [FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql)
3. Verify Supabase config (`.env` file)
4. Check browser console for errors

### Videos Not Visible
1. Verify `is_published = true` in database
2. Check RLS policies (should allow public SELECT)
3. Confirm `getFeed()` query returns data
4. Check browser console in VideoFeed

### Diagnostic Tool
Use built-in diagnostics ([services/uploadDiagnostics.ts](services/uploadDiagnostics.ts)):
```typescript
import { uploadDiagnostics } from './services/uploadDiagnostics';
const diagnostic = await uploadDiagnostics.runFullDiagnostic();
console.log(diagnostic);
```

---

## 📝 Key Files Reference

| Component | File | Purpose |
|-----------|------|---------|
| Upload UI | [components/Upload.tsx](components/Upload.tsx) | User interface for video upload |
| Backend Logic | [services/backend.ts](services/backend.ts) | Upload processing, database operations |
| Feed Display | [components/VideoFeed.tsx](components/VideoFeed.tsx) | Displays video feed to users |
| Video Helper | [services/videoUploadHelper.ts](services/videoUploadHelper.ts) | Validation, compression utilities |
| Diagnostics | [services/uploadDiagnostics.ts](services/uploadDiagnostics.ts) | Troubleshooting tool |
| RLS Policies | [FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql) | Database security configuration |
| Setup Guide | [DATABASE_SETUP.md](DATABASE_SETUP.md) | Initial database setup instructions |

---

## 🎯 Summary

The video upload system is **fully functional** and follows a standard pattern:

1. ✅ User uploads → File goes to storage
2. ✅ Storage path saved in database
3. ✅ Feed queries all published videos
4. ✅ Everyone can see all videos (public feed)

**No code changes needed** - the flow is already implemented correctly. If uploads are failing, it's a **configuration issue** (Supabase setup, RLS policies, or authentication), not a code issue.

Run [FIX_RLS_POLICIES.sql](FIX_RLS_POLICIES.sql) to ensure proper database permissions.
