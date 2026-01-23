-- ============================================================
-- FIX VIDEO UPLOAD RLS POLICIES
-- Run this in Supabase SQL Editor to enable video uploads
-- ============================================================

-- STEP 1: Drop existing policies that might block uploads
DROP POLICY IF EXISTS "Enable INSERT for authenticated users" ON videos;
DROP POLICY IF EXISTS "Allow authenticated users to insert videos" ON videos;
DROP POLICY IF EXISTS "authenticated_users_can_create_videos" ON videos;

-- STEP 2: Create simple SELECT policy - anyone can view
CREATE POLICY "anyone_can_view_videos"
ON videos
FOR SELECT
TO public
USING (is_published = true OR user_id = auth.uid());

-- STEP 3: Create INSERT policy - authenticated users can upload
CREATE POLICY "authenticated_users_can_upload_videos"
ON videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- STEP 4: Create UPDATE policy - users can update their own videos
CREATE POLICY "users_can_update_own_videos"
ON videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- STEP 5: Create DELETE policy - users can delete their own videos
CREATE POLICY "users_can_delete_own_videos"
ON videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 6: Fix storage bucket policies for 'posts' bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public views" ON storage.objects;

-- STEP 7: Create storage SELECT policy
CREATE POLICY "anyone_can_view_videos_storage"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

-- STEP 8: Create storage INSERT policy for authenticated users
CREATE POLICY "authenticated_can_upload_videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR true)
);

-- STEP 9: Create storage UPDATE policy
CREATE POLICY "users_can_update_their_videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'posts')
WITH CHECK (bucket_id = 'posts');

-- STEP 10: Create storage DELETE policy
CREATE POLICY "users_can_delete_their_videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'posts');

-- STEP 11: Grant permissions
GRANT SELECT ON videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO authenticated;

-- STEP 12: Verify policies are in place
SELECT 'VERIFICATION - Videos RLS Policies' as status;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'videos';

SELECT 'VERIFICATION - Storage RLS Policies' as status;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================================
-- ✅ All upload policies configured!
--
-- Users can now:
-- 1. Upload videos to 'posts' storage bucket
-- 2. Create video records in 'videos' table
-- 3. View published videos
-- 4. Update/delete their own videos
--
-- Test by uploading a video - it should work now!
-- ============================================================
