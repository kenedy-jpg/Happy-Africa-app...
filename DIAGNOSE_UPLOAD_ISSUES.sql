-- ============================================================
-- DIAGNOSE VIDEO UPLOAD ISSUES
-- Run this in Supabase SQL Editor to check upload configuration
-- ============================================================

-- STEP 1: Check if videos table exists and is configured correctly
SELECT 'VIDEOS TABLE CHECK' as check;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

-- STEP 2: Check for RLS policies on videos table (should allow INSERT)
SELECT 'VIDEOS TABLE RLS POLICIES' as check;
SELECT 
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'videos'
ORDER BY policyname;

-- STEP 3: Check storage buckets
SELECT 'STORAGE BUCKETS' as check;
SELECT 
  id as bucket_name,
  public as is_public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets;

-- STEP 4: Check storage policies for uploads
SELECT 'STORAGE UPLOAD POLICIES' as check;
SELECT 
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- STEP 5: Check if auth is working
SELECT 'AUTH STATUS' as check;
-- This will show if you have any users
SELECT COUNT(*) as user_count FROM auth.users;

-- STEP 6: Check recent videos (if any)
SELECT 'RECENT VIDEOS' as check;
SELECT 
  id,
  user_id,
  url,
  description,
  is_published,
  created_at
FROM videos
ORDER BY created_at DESC
LIMIT 5;

-- STEP 7: Check video table permissions
SELECT 'VIDEO TABLE GRANTS' as check;
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'videos'
GROUP BY grantee, privilege_type;

-- STEP 8: If no INSERT policies exist, suggest fix
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️ WARNING: No INSERT policies on videos table! Users cannot upload videos.'
    ELSE '✅ OK: INSERT policies exist'
  END as policy_status
FROM pg_policies
WHERE tablename = 'videos' AND permissive = true;

-- ============================================================
-- COMMON ISSUES AND FIXES:
--
-- Issue 1: "RLS policy denies upload"
-- Fix: Run CREATE_VIDEO_UPLOAD_POLICIES.sql (see below)
--
-- Issue 2: "Storage bucket not found"
-- Fix: Create 'posts' bucket in Supabase Storage
--
-- Issue 3: "User has no permission to insert"
-- Fix: Grant INSERT permission to authenticated users
--
-- ============================================================
