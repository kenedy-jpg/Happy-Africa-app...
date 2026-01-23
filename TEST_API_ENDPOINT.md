# Testing Your Upload API

The connection error means the `/api/upload-url` endpoint is not responding. Here's how to diagnose:

## Step 1: Check Vercel Environment Variables

Your API needs Supabase credentials to work. Make sure these are set in Vercel:

1. Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Check these variables exist:
   - ✅ `VITE_SUPABASE_URL` = `https://mlgxgylvndtvyqrdfvlw.supabase.co`
   - ✅ `VITE_SUPABASE_ANON_KEY` = (your Supabase anon key)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` = (your Supabase service role key)

3. If missing, add them:
   - Get `SUPABASE_ANON_KEY` from: Supabase → Settings → API → `anon` public key
   - Get `SERVICE_ROLE_KEY` from: Supabase → Settings → API → `service_role` secret key

4. After adding, **redeploy** your project:
   - Go to Vercel → Deployments
   - Click "Redeploy" on latest deployment
   - Or: Push a new commit to GitHub to trigger auto-deploy

## Step 2: Test the API Directly

Once redeployed, test the endpoint:

**Desktop Browser Console:**
```javascript
// Paste this in your browser DevTools Console (F12)
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'test.mp4',
    contentType: 'video/mp4'
  })
})
.then(r => r.json())
.then(data => console.log('SUCCESS:', data))
.catch(err => console.error('ERROR:', err.message))
```

Expected response:
```json
{
  "uploadUrl": "https://...",
  "path": "videos/1234567-test.mp4",
  "token": "..."
}
```

If you get an error → copy the error and share it.

## Step 3: Check Browser Network Tab

When trying to upload in the app:
1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Try uploading a video
4. Look for `/api/upload-url` request
5. Click it and check:
   - **Status**: Should be 200 (success)
   - **Response**: Should show JSON with uploadUrl
   - **Preview**: Shows the actual error if it fails

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **404 Not Found** | API file doesn't exist. Make sure `/api/upload-url.ts` exists |
| **500 Server Error** | Missing environment variables in Vercel. Add them and redeploy |
| **No response / connection refused** | API endpoint not deployed. Check Vercel Functions are enabled |
| **Timeout (>30s)** | Supabase might be slow. Try again or check Supabase status |

## For Immediate Debugging

Run this in browser console to get detailed diagnostics:

```javascript
// 1. Check if Supabase is reachable
fetch('https://mlgxgylvndtvyqrdfvlw.supabase.co/rest/v1/?', {
  headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZ3hneWx2bmR0dnlxcmRmdmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjYyMjYsImV4cCI6MjA4MTIwMjIyNn0.nc5Uv2Bf9UgfqWc2Ph8LQwqTY09c9IY6WQqtKBXpVr0' }
})
.then(r => console.log('Supabase reachable:', r.status))
.catch(e => console.error('Supabase unreachable:', e.message))

// 2. Check API endpoint
fetch('/api/upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileName: 'test.mp4', contentType: 'video/mp4' })
})
.then(r => r.text())
.then(t => console.log('API Response:', t))
.catch(e => console.error('API Error:', e.message))
```

---

**Once fixed, your upload should work instantly!** 🎉
