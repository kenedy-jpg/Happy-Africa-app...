-- FIX RLS POLICIES FOR VIDEO UPLOADS
-- Run this SQL in your Supabase SQL Editor

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "allow_authenticated_insert" ON videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON videos;
DROP POLICY IF EXISTS "Users can update own videos" ON videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON videos;
DROP POLICY IF EXISTS "Public videos are viewable by all" ON videos;

-- 2. Create comprehensive RLS policies that actually work

-- Allow ANY authenticated user to insert videos (most permissive)
CREATE POLICY "authenticated_insert_videos"
ON videos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow ANY authenticated user to update their OWN videos
CREATE POLICY "authenticated_update_own_videos"
ON videos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow ANY authenticated user to delete their OWN videos
CREATE POLICY "authenticated_delete_own_videos"
ON videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow EVERYONE (including anon) to SELECT/view videos
CREATE POLICY "public_select_videos"
ON videos
FOR SELECT
TO public
USING (true);

-- 3. Ensure RLS is enabled
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT INSERT, SELECT, UPDATE, DELETE ON videos TO authenticated;
GRANT SELECT ON videos TO anon;

-- 5. Verify policies are active
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'videos';
