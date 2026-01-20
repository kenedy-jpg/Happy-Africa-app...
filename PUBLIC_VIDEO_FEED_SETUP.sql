-- ============================================================
-- PUBLIC VIDEO FEED SETUP FOR HAPPY AFRICA
-- Run this SQL in your Supabase SQL Editor
-- This makes uploaded videos visible to ALL users (TikTok-style)
-- ============================================================

-- 1. CREATE VIDEOS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  duration INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reposted_from TEXT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_is_published ON videos(is_published);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 3. DROP OLD POLICIES (clean slate)
DROP POLICY IF EXISTS "allow_authenticated_insert" ON videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON videos;
DROP POLICY IF EXISTS "Public videos are viewable by all" ON videos;
DROP POLICY IF EXISTS "Anyone can view published videos" ON videos;
DROP POLICY IF EXISTS "authenticated_insert_videos" ON videos;
DROP POLICY IF EXISTS "authenticated_update_own_videos" ON videos;
DROP POLICY IF EXISTS "authenticated_delete_own_videos" ON videos;
DROP POLICY IF EXISTS "public_select_videos" ON videos;
DROP POLICY IF EXISTS "Public can view videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON videos;

-- 4. CREATE NEW POLICIES (TikTok-style public feed)

-- ✅ EVERYONE CAN VIEW ALL VIDEOS (including anonymous users)
-- This is the KEY policy that makes videos appear in the news feed
CREATE POLICY "Public can view all videos"
ON videos
FOR SELECT
TO public
USING (true);

-- ✅ Authenticated users can UPLOAD their own videos
CREATE POLICY "Authenticated users can upload videos"
ON videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can UPDATE their own videos
CREATE POLICY "Users can update their own videos"
ON videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can DELETE their own videos
CREATE POLICY "Users can delete their own videos"
ON videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. GRANT PERMISSIONS
GRANT SELECT ON videos TO anon;
GRANT SELECT ON videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON videos TO authenticated;

-- 6. STORAGE BUCKET POLICIES
-- These allow file uploads and public access to video files

-- Drop old storage policies
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view video files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload video files" ON storage.objects;
DROP POLICY IF EXISTS "Users upload videos" ON storage.objects;

-- ✅ EVERYONE can VIEW video files (public access)
CREATE POLICY "Public can view all video files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- ✅ Authenticated users can UPLOAD video files
CREATE POLICY "Authenticated users can upload video files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- ✅ Users can DELETE their own video files
CREATE POLICY "Users can delete their own video files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 7. VERIFY POLICIES ARE ACTIVE
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'videos'
ORDER BY policyname;

-- 8. TEST QUERY (should return all videos for feed)
-- SELECT * FROM videos WHERE is_published = true ORDER BY created_at DESC LIMIT 20;

-- ============================================================
-- SETUP COMPLETE! 
-- Videos will now appear in the public feed for ALL users
-- ============================================================
