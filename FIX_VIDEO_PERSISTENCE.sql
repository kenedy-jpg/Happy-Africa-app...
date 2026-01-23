-- ============================================================
-- FIX VIDEO PERSISTENCE & PUBLIC VISIBILITY
-- Run this in Supabase SQL Editor to ensure:
-- 1. Videos persist after page refresh
-- 2. All users can see all uploaded videos (TikTok-style)
-- ============================================================

-- STEP 1: Ensure videos table exists with correct structure
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  poster_url TEXT,
  duration INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  music_track TEXT,
  location_name TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_published BOOLEAN DEFAULT true,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  reposted_from TEXT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Add indexes for performance (critical for 5M+ users)
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_is_published ON videos(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_published_created ON videos(is_published, created_at DESC) WHERE is_published = true;

-- STEP 3: Enable Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- STEP 4: Drop ALL old policies (clean slate)
DO $$ 
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'videos'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON videos', policy_rec.policyname);
    END LOOP;
END $$;

-- STEP 5: Create NEW policies for TikTok-style public feed

-- ✅ CRITICAL: Everyone can VIEW all published videos (including anonymous users)
-- This is what makes videos appear in the feed for ALL users
CREATE POLICY "everyone_can_view_published_videos"
ON videos
FOR SELECT
TO public
USING (is_published = true);

-- ✅ Authenticated users can INSERT their own videos
CREATE POLICY "authenticated_users_can_upload"
ON videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_published = true);

-- ✅ Users can UPDATE their own videos
CREATE POLICY "users_can_update_own_videos"
ON videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can DELETE their own videos
CREATE POLICY "users_can_delete_own_videos"
ON videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 6: Grant table permissions
GRANT SELECT ON videos TO anon;
GRANT SELECT ON videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON videos TO authenticated;

-- STEP 7: Ensure storage bucket exists and has correct policies
-- Note: Bucket must be created first in Supabase Dashboard > Storage

-- Drop old storage policies
DO $$ 
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%video%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_rec.policyname);
    END LOOP;
END $$;

-- ✅ Everyone can VIEW video files (public read access)
CREATE POLICY "public_can_view_all_videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- ✅ Authenticated users can UPLOAD video files
CREATE POLICY "authenticated_can_upload_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- ✅ Users can UPDATE their own video files (for metadata)
CREATE POLICY "users_can_update_own_video_files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ✅ Users can DELETE their own video files
CREATE POLICY "users_can_delete_own_video_files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- STEP 8: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  is_seller BOOLEAN DEFAULT false,
  email TEXT,
  profile_views_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "public_can_view_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;

CREATE POLICY "public_can_view_profiles"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "users_can_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- STEP 9: Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for videos
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 10: Create view for videos with user info (for easier queries)
CREATE OR REPLACE VIEW videos_with_profiles AS
SELECT 
  v.*,
  p.username,
  p.full_name,
  p.avatar_url,
  p.followers_count
FROM videos v
LEFT JOIN profiles p ON v.user_id = p.id
WHERE v.is_published = true
ORDER BY v.created_at DESC;

-- Grant access to view
GRANT SELECT ON videos_with_profiles TO anon;
GRANT SELECT ON videos_with_profiles TO authenticated;

-- STEP 11: Verify setup
SELECT 
  'Videos Table' as check_type,
  COUNT(*) as count
FROM videos
UNION ALL
SELECT 
  'Profiles Table' as check_type,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  'Videos Policies' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'videos'
UNION ALL
SELECT 
  'Storage Policies' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%video%';

-- STEP 12: Test query (should return all videos)
-- Run this to verify videos are accessible:
-- SELECT id, user_id, description, created_at FROM videos WHERE is_published = true ORDER BY created_at DESC LIMIT 10;

-- ============================================================
-- ✅ SETUP COMPLETE!
-- 
-- What this fixes:
-- 1. Videos now persist in database after page refresh
-- 2. All users (including anonymous) can see all uploaded videos
-- 3. Videos appear in public feed like TikTok
-- 4. Proper permissions for upload, update, delete
-- 5. Optimized indexes for 5M+ users
--
-- Next steps:
-- 1. Verify your Supabase environment variables in Vercel:
--    - VITE_SUPABASE_URL
--    - VITE_SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_ROLE_KEY (for API endpoints)
--
-- 2. Test by uploading a video and refreshing the page
--
-- 3. Check that videos appear for other users
-- ============================================================
