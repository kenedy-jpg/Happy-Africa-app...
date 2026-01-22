-- ============================================================
-- COMPLETE VIDEO UPLOAD & FEED SYSTEM FOR HAPPY AFRICA
-- This ensures videos upload via presigned URLs, persist after refresh,
-- and are visible to all users in the feed
-- ============================================================

-- 1. CREATE VIDEOS TABLE
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
  category TEXT DEFAULT 'general',
  location_name TEXT,
  music_track TEXT DEFAULT 'Original Sound',
  hashtags TEXT[],
  reposted_from TEXT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_is_published ON videos(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL OLD POLICIES (clean slate)
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
DROP POLICY IF EXISTS "Public can view all videos" ON videos;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON videos;

-- 4. CREATE NEW POLICIES

-- ✅ EVERYONE CAN VIEW ALL PUBLISHED VIDEOS (TikTok-style public feed)
CREATE POLICY "public_read_videos"
ON videos
FOR SELECT
TO public
USING (is_published = true);

-- ✅ Authenticated users can INSERT their own videos
CREATE POLICY "authenticated_insert_videos"
ON videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can UPDATE their own videos
CREATE POLICY "authenticated_update_own_videos"
ON videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can DELETE their own videos
CREATE POLICY "authenticated_delete_own_videos"
ON videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. GRANT TABLE PERMISSIONS
GRANT SELECT ON videos TO anon;
GRANT SELECT ON videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON videos TO authenticated;

-- ============================================================
-- STORAGE BUCKET SETUP
-- ============================================================

-- Note: Storage bucket 'videos' should be created via Supabase Dashboard
-- Go to: Storage → New Bucket → Name: "videos" → Private: YES

-- 6. DROP OLD STORAGE POLICIES
DROP POLICY IF EXISTS "Users can upload their own videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view video files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all video files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload video files" ON storage.objects;
DROP POLICY IF EXISTS "Users upload videos" ON storage.objects;
DROP POLICY IF EXISTS "signed_uploads_insert" ON storage.objects;
DROP POLICY IF EXISTS "public_read" ON storage.objects;

-- 7. STORAGE READ POLICY - Allow everyone to read video files
CREATE POLICY "public_storage_read_videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- 8. STORAGE INSERT POLICY - Allow authenticated users to upload via presigned URLs
CREATE POLICY "authenticated_storage_insert_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 9. STORAGE UPDATE POLICY - Allow users to update their own files
CREATE POLICY "authenticated_storage_update_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 10. STORAGE DELETE POLICY - Allow users to delete their own files
CREATE POLICY "authenticated_storage_delete_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================
-- PROFILES TABLE (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  is_seller BOOLEAN DEFAULT false,
  profile_views_enabled BOOLEAN DEFAULT true,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old profile policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Allow everyone to read profiles
CREATE POLICY "public_read_profiles"
ON profiles
FOR SELECT
TO public
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "authenticated_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "authenticated_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================================
-- FUNCTION TO UPDATE TIMESTAMP ON ROW UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to videos table
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if tables exist
DO $$
BEGIN
  RAISE NOTICE '✅ Setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Verify with these queries:';
  RAISE NOTICE '1. SELECT * FROM videos LIMIT 5;';
  RAISE NOTICE '2. SELECT * FROM profiles LIMIT 5;';
  RAISE NOTICE '3. SELECT * FROM storage.objects WHERE bucket_id = ''videos'';';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '1. Create storage bucket named "videos" in Supabase Dashboard';
  RAISE NOTICE '2. Test upload from your app';
  RAISE NOTICE '3. Verify videos appear in feed for all users';
END $$;
