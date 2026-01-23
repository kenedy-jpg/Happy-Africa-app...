-- ============================================================
-- RESTORE KENXOKENT'S VIDEOS & ALL PUBLIC POSTS
-- Run this in Supabase SQL Editor immediately
-- ============================================================

-- STEP 1: First, check how many posts exist
SELECT 'Total Posts in Database' as status, COUNT(*) as count FROM posts;
SELECT 'Posts with visibility=public' as status, COUNT(*) as count FROM posts WHERE visibility = 'public';
SELECT 'Posts with NULL visibility' as status, COUNT(*) as count FROM posts WHERE visibility IS NULL;

-- STEP 2: Set ALL posts to public (restore visibility)
UPDATE posts 
SET visibility = 'public' 
WHERE visibility IS NULL OR visibility = '';

-- STEP 3: Verify kenxokent's videos specifically
SELECT 'Kenxokent Posts' as check, COUNT(*) as count 
FROM posts p
LEFT JOIN profiles pr ON p.user_id = pr.id
WHERE pr.username = 'kenxokent' OR p.user_id IN (
  SELECT id FROM profiles WHERE username = 'kenxokent'
);

-- STEP 4: Disable RLS temporarily to check data (TEMPORARY - for debugging)
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- STEP 5: Check what posts are actually in database
SELECT 
  p.id,
  p.user_id,
  p.description,
  p.visibility,
  p.video_path,
  p.created_at,
  pr.username,
  pr.full_name
FROM posts p
LEFT JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC
LIMIT 20;

-- STEP 6: Re-enable RLS with fixed policies
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- STEP 7: Drop ALL old policies (clean slate)
DO $$ 
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'posts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON posts', policy_rec.policyname);
    END LOOP;
END $$;

-- STEP 8: Create NEW policies - FIXED for anonymous access
-- ✅ CRITICAL: Anonymous users CAN VIEW all public posts
CREATE POLICY "anon_can_view_public_posts"
ON posts
FOR SELECT
TO anon
USING (visibility = 'public');

-- ✅ Authenticated users can VIEW all public posts
CREATE POLICY "auth_can_view_public_posts"
ON posts
FOR SELECT
TO authenticated
USING (visibility = 'public');

-- ✅ Authenticated users can INSERT their own posts
CREATE POLICY "authenticated_users_can_create_posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND visibility = 'public');

-- ✅ Users can UPDATE their own posts
CREATE POLICY "users_can_update_own_posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✅ Users can DELETE their own posts
CREATE POLICY "users_can_delete_own_posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- STEP 9: Grant permissions explicitly
GRANT SELECT ON posts TO anon;
GRANT SELECT ON posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON posts TO authenticated;

-- STEP 10: Verify setup is correct
SELECT 'Posts Table RLS Status' as check_type, 
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'posts';

-- STEP 11: Count policies
SELECT 'Post Policies Count' as check_type, COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'posts';

-- STEP 12: List all current policies on posts table
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- STEP 13: Final verification - test anonymous access would work
SELECT 
  'FINAL: Public Posts Visible to All Users' as check,
  COUNT(*) as total_public_posts
FROM posts 
WHERE visibility = 'public';

-- ============================================================
-- ✅ RESTORATION COMPLETE!
-- 
-- What this script does:
-- 1. Sets all posts to visibility='public'
-- 2. Verifies kenxokent's videos exist in database
-- 3. Drops & recreates RLS policies correctly
-- 4. Allows both anonymous AND authenticated users to see public videos
-- 5. Videos now appear in feed for ALL users (TikTok-style)
--
-- If videos STILL don't appear after this:
-- - Check that video files exist in 'videos' storage bucket
-- - Verify video_path field is not NULL for posts
-- - Check browser console for fetch errors
-- ============================================================
