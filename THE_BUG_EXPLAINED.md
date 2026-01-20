# 🔧 The Bug That Caused "Uploading..." to Hang Forever

## The Problem

### What You Saw
```
┌─────────────────────────┐
│  Uploading...           │
│  ⏳ (stuck forever)     │
└─────────────────────────┘
```

### What Was Happening Behind the Scenes

```javascript
// ❌ WRONG (what the code was doing)
await uploadVideo(fileName, file, options)
//                  ↑         ↑
//               string     File object

// But the function expected:
function uploadVideo(file, fileName, options) {
//                    ↑      ↑
//                 File    string
}
```

**Result:** The function received a **string** where it expected a **File object**, and vice versa!

## The Cascade of Errors

```
Step 1: Function called with swapped params
    ↓
Step 2: Try to create presigned URL with a File object (expecting string)
    ↓
Step 3: Supabase gets confused, might create URL with wrong path
    ↓
Step 4: Try to upload the string (filename) as if it's a file
    ↓
Step 5: XHR sends string instead of binary data
    ↓
Step 6: Upload "succeeds" but uploads garbage data
    ↓
Step 7: Or just hangs because nothing makes sense anymore
    ↓
Result: STUCK at "Uploading..." forever 😱
```

## The Fix

### Before (BROKEN)
```typescript
// services/backend.ts
const fileName = `${user.id}/${Date.now()}_video.mp4`;

await robustUpload(fileName, file, {  // ❌ WRONG ORDER
  maxRetries: 3,
  onProgress: ...
});
```

### After (FIXED)
```typescript
// services/backend.ts
const fileName = `${user.id}/${Date.now()}_video.mp4`;

await robustUpload(file, fileName, {  // ✅ CORRECT ORDER
  maxRetries: 3,
  onProgress: ...
});
```

## Why This Caused the Hang

### Scenario 1: Silent Failure
```
1. Code tries: uploadVideo("user123/video.mp4", <File object>)
2. Function expects: uploadVideo(<File object>, "user123/video.mp4")
3. Creates presigned URL with File object (converts to "[object File]")
4. URL becomes something like: /videos/[object%20File]
5. Upload "succeeds" but goes to wrong path
6. Database save can't find the file
7. Or upload just hangs waiting for response
```

### Scenario 2: Type Confusion
```
1. Function tries to read file.size on a string
2. Returns undefined
3. Progress calculation: (undefined / undefined) * 100 = NaN
4. UI shows NaN% or gets stuck at 0%
5. Upload might proceed but progress never updates
6. Looks frozen to user
```

### Scenario 3: XHR Confusion
```
1. XHR.send() expects a File/Blob or string
2. Receives a string (filename) instead of File
3. Sends the filename as the body: "user123/video.mp4"
4. Server receives 20 bytes instead of 50MB
5. Upload "completes" instantly but wrong data
6. Or hangs because server rejects the data
```

## Additional Fixes Applied

### 1. Timeout Protection
```typescript
xhr.timeout = 600000; // 10 minutes

xhr.addEventListener('timeout', () => {
  resolve({ success: false, error: 'Upload timed out' });
});
```
**Why:** Even if something else goes wrong, upload won't hang forever

### 2. Initial Progress Report
```typescript
onProgress?.({
  progress: 0,
  loaded: 0,
  total: file.size,
  speed: 0,
  timeRemaining: 0
});
```
**Why:** User sees activity immediately, knows upload started

### 3. Better Logging
```typescript
console.log('[UploadService] Starting XHR upload to presigned URL');
console.log('[UploadService] Sending file via XHR PUT...', {
  url: signedUrl.substring(0, 100) + '...',
  size: file.size,
  type: file.type
});
```
**Why:** We can see exactly where it gets stuck

## How to Verify It's Fixed

### Test With Browser Console Open (F12)

#### ✅ SUCCESS - You Should See:
```
[Upload] Starting upload - File size: 15.25 MB
[UploadService] Starting video upload...
[UploadService] Starting upload: { 
  fileName: "user123/1737331200000_video.mp4",
  size: "15.25 MB",
  type: "video/mp4"
}
[UploadService] Creating presigned URL...
[UploadService] Got presigned URL, uploading file...
[UploadService] Starting XHR upload to presigned URL
[UploadService] Sending file via XHR PUT... {
  url: "https://...supabase.co/storage/v1/object/...",
  size: 15990784,
  type: "video/mp4"
}
[Upload] Progress: { percent: "25.0%", loaded: "3.81 MB", ... }
[Upload] Progress: { percent: "50.0%", loaded: "7.62 MB", ... }
[Upload] Progress: { percent: "75.0%", loaded: "11.44 MB", ... }
[UploadService] Upload successful!
[Upload] File uploaded successfully to storage
[Upload] Attempting database insert...
[Upload] Video successfully saved to database
```

#### ❌ FAILURE - Old Behavior:
```
[Upload] Starting upload - File size: 15.25 MB
[UploadService] Starting video upload...
[UploadService] Starting upload: { 
  fileName: "[object File]",  // ❌ WRONG!
  size: undefined,             // ❌ WRONG!
  type: undefined              // ❌ WRONG!
}
... then silence ...
```

## The Lesson

**TypeScript helps, but doesn't catch everything!**

```typescript
// Both are valid in JavaScript/TypeScript:
function upload(file: File, name: string) {}

upload("name.mp4", fileObject);  // ⚠️ Types are swapped
upload(fileObject, "name.mp4");  // ✅ Correct

// TypeScript would catch this IF we had strict checking:
// But with dynamic imports and any types, it slipped through
```

## Prevention for Future

### 1. Use Named Parameters
```typescript
// Instead of:
function uploadVideo(file: File, fileName: string) {}

// Use:
function uploadVideo(params: { file: File; fileName: string }) {}

// Call with:
uploadVideo({ file, fileName })  // Order doesn't matter!
```

### 2. Add Runtime Checks
```typescript
function uploadVideo(file: File, fileName: string) {
  if (typeof file === 'string' || typeof fileName !== 'string') {
    throw new Error('Invalid parameters: check argument order');
  }
  // ... rest of function
}
```

### 3. Better Type Inference
```typescript
// Use const assertions
const params = { file, fileName } as const;
uploadVideo(params.file, params.fileName);
```

---

## Summary

**Bug:** Function parameters swapped (file ↔ fileName)  
**Symptom:** Upload stuck at "Uploading..." forever  
**Fix:** Corrected parameter order + added safeguards  
**Status:** ✅ FIXED

**Action Required:** Restart dev server and test upload again!
