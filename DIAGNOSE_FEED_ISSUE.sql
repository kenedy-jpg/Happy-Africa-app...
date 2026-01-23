-- ============================================================
-- DIAGNOSE WHY FEED IS EMPTY
-- Run this script to see what's in your database
-- ============================================================

-- STEP 1: Check if posts table exists and has data
SELECT 'POSTS TABLE STATUS' as check;
SELECT COUNT(*) as total_posts FROM posts;

-- STEP 2: Show first 5 posts (for debugging)
SELECT 
  id,
  user_id,
  description,
  video_path,
  visibility,
  created_at
FROM posts
ORDER BY created_at DESC
LIMIT 5;

-- STEP 3: Check visibility distribution
SELECT 
  visibility,
  COUNT(*) as count
FROM posts
GROUP BY visibility;

-- STEP 4: Check if there are any RLS policies blocking access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('posts', 'videos')
ORDER BY tablename, policyname;

-- STEP 5: Check storage buckets and policies
SELECT 
  id as bucket_name,
  public as is_public
FROM storage.buckets;

-- STEP 6: Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- STEP 7: If posts table is empty, suggest creation
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'WARNING: posts table is EMPTY! Videos uploaded need to be in posts table.'
    ELSE 'OK: posts table has data'
  END as status
FROM posts;

-- STEP 8: Check if videos table has data (old system)
SELECT 'VIDEOS TABLE STATUS' as check;
SELECT COUNT(*) as total_videos FROM videos;

-- STEP 9: Show sample videos from videos table
SELECT 
  id,
  user_id,
  description,
  created_at
FROM videos
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================
-- INTERPRETATION GUIDE:
-- 
-- If posts table is EMPTY but videos table has data:
--   → You have old videos in "videos" table, not "posts" table
--   → Need to migrate videos from videos → posts table
--   → OR change backend.ts to query "videos" table instead
--
-- If posts table has data but visibility = NULL:
--   → Run: UPDATE posts SET visibility = 'public' WHERE visibility IS NULL;
--   → Then restore RLS policies with RESTORE_RLS_WITH_KENXOKENT_FIX.sql
--
-- If RLS policies are blocking (USING clause restricts access):
--   → Videos won't show in feed
--   → Need to run RESTORE_RLS_WITH_KENXOKENT_FIX.sql
--
-- ============================================================
