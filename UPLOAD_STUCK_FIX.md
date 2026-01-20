# 🐛 Upload Stuck Fix - Applied

## Issue Fixed
**Problem:** Upload keeps saying "uploading" and never completes

**Root Cause:** Parameters were swapped in the function call
- Code was calling: `uploadVideo(fileName, file, options)`  
- Should be: `uploadVideo(file, fileName, options)` ✅

## Changes Made

1. **Fixed parameter order** in `services/backend.ts`
   - Corrected function call to match signature

2. **Added timeout handling** (10 minutes for large files)
   - Prevents infinite hangs
   - Shows clear error if upload takes too long

3. **Added initial progress reporting**
   - Shows 0% immediately when upload starts
   - User sees activity right away

4. **Enhanced logging** for debugging
   - XHR upload logs
   - Progress tracking logs
   - Error details

## How to Test

### 1. Restart Dev Server (Important!)
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 2. Upload a Test Video
1. Open http://localhost:5173
2. Log in
3. Click Upload/+ button
4. Select a video (start with small file < 10MB)
5. Fill details and click "POST NOW"

### 3. Watch Browser Console (F12)

**What you should see:**
```
[Upload] Starting upload - File size: 5.25 MB
[UploadService] Starting video upload...
[UploadService] Starting upload: { fileName, size, type, maxRetries: 3 }
[UploadService] Creating presigned URL...
[UploadService] Got presigned URL, uploading file...
[UploadService] Starting XHR upload to presigned URL
[UploadService] Sending file via XHR PUT...
[Upload] Progress: { percent: "25.0%", ... }
[Upload] Progress: { percent: "50.0%", ... }
[Upload] Progress: { percent: "75.0%", ... }
[UploadService] Upload successful!
[Upload] File uploaded successfully to storage
[Upload] Attempting database insert...
[Upload] Video successfully saved to database
```

**If it hangs, you'll see:**
```
[UploadService] XHR timeout
// OR
[UploadService] XHR network error
// OR
[UploadService] XHR upload failed: { status: 500, ... }
```

## Troubleshooting

### Still Hangs at "Creating presigned URL"?
**Issue:** Supabase client not configured

**Fix:**
```bash
# Check .env file exists and has:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Restart dev server after adding/updating .env
```

### Hangs at "Starting XHR upload"?
**Issue:** Network/CORS problem

**Fixes:**
1. Check Supabase Dashboard → Storage → Configuration
2. Verify CORS allows your origin
3. Check browser Network tab (F12) for blocked requests

### Gets "XHR timeout" error?
**Issue:** File too large or slow connection

**Fixes:**
1. Try smaller file (< 50MB first)
2. Check internet speed
3. Increase timeout in `uploadService.ts` (line ~197):
   ```typescript
   xhr.timeout = 1200000; // 20 minutes instead of 10
   ```

### Database insert fails?
**Issue:** RLS policies blocking insert

**Fix:**
```bash
# Run in Supabase SQL Editor:
# See FIX_RLS_POLICIES.sql
```

## Quick Test Script

```bash
# Run automated checks
./test-upload.sh

# This will verify:
# ✓ Dev server running
# ✓ Supabase configured
# ✓ Upload service exists
# ✓ Backend integration correct
```

## Expected Timeline

| File Size | Expected Time |
|-----------|---------------|
| < 10MB    | 5-15 seconds  |
| 10-50MB   | 15-30 seconds |
| 50-100MB  | 30-90 seconds |
| 100-200MB | 1-3 minutes   |

*Times vary based on internet speed*

## Still Not Working?

If upload still hangs after these fixes:

1. **Check what's in the console**
   - Copy the last few log lines
   - This shows exactly where it's stuck

2. **Try curl test**
   ```bash
   ./test-presigned-upload.sh
   # This tests upload without the app
   ```

3. **Check Supabase logs**
   - Dashboard → Logs → Storage
   - Look for errors around the upload time

4. **Try standard upload fallback**
   - Edit `services/uploadService.ts` line ~288
   - Comment out presigned upload:
   ```typescript
   export async function uploadVideo(...) {
     // Skip presigned, use only standard
     const standardResult = await uploadVideoStandard(file, fileName, options);
     if (!standardResult.success) {
       throw new Error(standardResult.error || 'Upload failed');
     }
   }
   ```

---

## Summary

✅ **Parameter order fixed** - Main cause of hang  
✅ **Timeout added** - Prevents infinite waiting  
✅ **Better logging** - Shows exactly where it's stuck  
✅ **Progress feedback** - User sees immediate activity  

**Next:** Restart dev server and try uploading again!
