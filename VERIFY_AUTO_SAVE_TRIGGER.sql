-- ============================================================
-- VERIFY AUTO-SAVE TRIGGER IS WORKING
-- Run this to check if uploads automatically create video records
-- ============================================================

-- STEP 1: Check if trigger exists
SELECT 'TRIGGER STATUS' as check;
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_insert_video_on_upload';

-- STEP 2: Check if function exists
SELECT 'FUNCTION STATUS' as check;
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'insert_video_on_upload';

-- STEP 3: Check videos table structure (make sure field names match)
SELECT 'VIDEOS TABLE COLUMNS' as check;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'videos'
ORDER BY ordinal_position;

-- STEP 4: Check recent videos created by trigger
SELECT 'RECENT AUTO-CREATED VIDEOS' as check;
SELECT 
  id,
  user_id,
  url,
  video_path,
  description,
  created_at
FROM videos
ORDER BY created_at DESC
LIMIT 10;

-- STEP 5: Count videos with and without descriptions (auto-created have no description)
SELECT 'AUTO-CREATED VS MANUAL' as check;
SELECT 
  CASE 
    WHEN description IS NULL OR description = '' THEN 'Auto-created (no description)'
    ELSE 'Manually created (has description)'
  END as type,
  COUNT(*) as count
FROM videos
GROUP BY type;

-- STEP 6: Verify storage and videos are in sync
SELECT 'SYNC CHECK' as status;
SELECT COUNT(*) as storage_files FROM storage.objects WHERE bucket_id = 'videos';
SELECT COUNT(*) as video_records FROM videos;

-- ============================================================
-- INTERPRETATION:
--
-- ✅ If you see the trigger in results:
--    Videos are auto-creating when files upload
--    Upload flow is complete and automatic
--
-- ⚠️ If trigger is missing or function fails:
--    Run the CREATE TRIGGER script again
--    Check that fields match your videos table
--
-- Current implementation:
-- - Trigger fires AFTER INSERT on storage.objects
-- - Creates video record with:
--   * user_id from auth.uid()
--   * video_path/url from storage file name
--   * created_at timestamp
--
-- ============================================================
