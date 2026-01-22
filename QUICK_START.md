# 🚀 Quick Start - Video Upload System

Get your video upload system running in 5 minutes!

## Prerequisites Checklist

Before starting, make sure you have:
- [ ] Supabase account and project
- [ ] Vercel account
- [ ] Git repository
- [ ] Node.js installed

## Step 1: Supabase Setup (2 minutes)

### A. Create Storage Bucket
1. Go to Supabase Dashboard → **Storage**
2. Click **New Bucket** → Name: `videos` → **Create**

### B. Run Database Migration
1. Go to Supabase Dashboard → **SQL Editor**
2. Open `PRESIGNED_URL_SETUP.sql` from your repo
3. Copy all the SQL code
4. Paste into SQL Editor → **Run**

### C. Get Your Keys
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy:
   - Project URL: `https://[project-id].supabase.co`
   - Anon key: `eyJ...`
   - Service Role key: `eyJ...` (keep secret!)

## Step 2: Environment Variables (1 minute)

### Local Development
Create `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Vercel Production
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add all three variables above
3. Select **All Environments**

## Step 3: Deploy (2 minutes)

### Option A: Automated Deploy (Recommended)
```bash
./deploy-presigned.sh
```
Follow the prompts and choose option 1 (production deploy).

### Option B: Manual Deploy
```bash
# Build
npm run build

# Deploy
vercel --prod
```

## Step 4: Verify Everything Works

### Test 1: Check API Endpoints
```bash
# Replace YOUR_DOMAIN with your Vercel URL
curl -X POST https://YOUR_DOMAIN.vercel.app/api/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","contentType":"video/mp4"}'
```

✅ Expected: JSON response with `uploadUrl`, `path`, and `token`

### Test 2: Check Database
In Supabase SQL Editor:
```sql
SELECT * FROM posts LIMIT 5;
```

✅ Expected: Table exists (may be empty)

### Test 3: Upload a Video
1. Open your deployed app
2. Click upload button
3. Select a video file
4. Watch it upload
5. Check it appears in the feed

✅ Expected: Video uploads and shows in feed immediately

## Common Issues & Quick Fixes

### ❌ "Failed to create signed URL"
**Fix**: Check SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables

### ❌ Videos don't appear in feed
**Fix**: 
1. Check browser console for errors
2. Verify SQL migration ran: `SELECT * FROM posts;`
3. Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE posts;`

### ❌ API endpoints return 404
**Fix**:
1. Verify `api/` folder exists with `.ts` files
2. Check `vercel.json` is configured correctly
3. Redeploy: `vercel --prod`

### ❌ Upload stuck at 0%
**Fix**:
1. Check file size (Supabase free tier: 50MB limit)
2. Try a smaller video file
3. Check browser console for errors

## Architecture Overview

```
User Uploads Video
    ↓
Frontend calls /api/upload-url
    ↓
API returns presigned URL
    ↓
Frontend uploads directly to Supabase Storage
    ↓
Frontend calls /api/create-post
    ↓
Post record saved in database
    ↓
Real-time subscription notifies all users
    ↓
Video appears in everyone's feed
```

## File Structure

```
your-app/
├── api/
│   ├── upload-url.ts        # Generate presigned URLs
│   └── create-post.ts       # Create post records
├── components/
│   └── PostsFeed.tsx        # Display all posts
├── services/
│   ├── postUploadService.ts # Upload logic
│   └── supabaseClient.ts    # Supabase config
├── PRESIGNED_URL_SETUP.sql  # Database migration
├── vercel.json              # Vercel config
└── deploy-presigned.sh      # Deployment script
```

## Next Steps

Once everything is working:

1. **Customize PostsFeed Component**
   - Add filters (category, date)
   - Add search functionality
   - Add pagination

2. **Add User Profiles**
   - Create profiles table
   - Show user info with posts

3. **Add Interactions**
   - Likes, comments, shares
   - Create interaction tables

4. **Improve Upload UI**
   - Add video preview
   - Add thumbnail selection
   - Add progress indicator

5. **Add Video Processing**
   - Generate thumbnails automatically
   - Compress videos
   - Add watermarks

## Need Help?

- **Deployment Guide**: See `PRESIGNED_URL_DEPLOYMENT.md`
- **Implementation Examples**: See `IMPLEMENTATION_EXAMPLES.tsx`
- **Vercel Logs**: Dashboard → Deployments → Function Logs
- **Supabase Logs**: Dashboard → Logs
- **Browser Console**: F12 → Console tab

## Success Checklist

Your system is working when:
- [x] Build completes without errors
- [x] Deployed to Vercel successfully
- [x] API endpoints respond correctly
- [x] Videos upload successfully
- [x] Posts appear in database
- [x] Videos show in feed
- [x] Videos persist after refresh
- [x] New videos appear automatically (real-time)

## 🎉 Congratulations!

You now have a production-ready video upload system!

**What you've built:**
- ✅ Secure video uploads with presigned URLs
- ✅ Real-time feed updates
- ✅ Public video sharing
- ✅ Scalable architecture
- ✅ Production deployment

Happy coding! 🚀
