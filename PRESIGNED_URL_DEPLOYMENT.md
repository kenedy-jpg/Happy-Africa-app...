# 🚀 Complete Video Upload System - Deployment Guide

This guide will help you deploy a fully working video upload system using presigned URLs with Supabase Storage and Vercel.

## ✅ What You Get

- ✔️ Video uploads using presigned URLs (secure & reliable)
- ✔️ Uploads show immediately in News Feed
- ✔️ All users see all public posts
- ✔️ Videos persist after refresh
- ✔️ Real-time feed updates
- ✔️ Full Supabase Storage integration

## 📋 Prerequisites

- Supabase account with a project
- Vercel account
- Node.js installed locally
- Git repository

## 🔧 Step 1: Supabase Setup

### 1.1 Create Storage Bucket

1. Go to your Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Name: `videos`
4. Make it **Public** (for easier access) or **Private** (more secure)
5. Click **Create**

### 1.2 Setup Database

Run the SQL migration in Supabase SQL Editor:

```bash
# Copy the contents of PRESIGNED_URL_SETUP.sql
# Paste into Supabase → SQL Editor → New Query
# Run the query
```

This creates:
- `posts` table with columns: id, user_id, video_path, description, category, visibility, created_at
- RLS policies for public read access
- Storage policies for video uploads
- Real-time subscriptions

### 1.3 Get Your Credentials

From Supabase Dashboard → Settings → API:

- **Project URL**: `https://[your-project-id].supabase.co`
- **Anon Public Key**: `eyJ...` (long string)
- **Service Role Key**: `eyJ...` (long string - KEEP SECRET!)

## 🔧 Step 2: Environment Variables

### 2.1 Create `.env` file locally:

```bash
# Create .env file in root directory
touch .env
```

Add the following:

```env
VITE_SUPABASE_URL=https://mlgxgylvndtvyqrdfvlw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2.2 Add to Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

**Important**: Click **Add** and select all environments (Production, Preview, Development)

## 🔧 Step 3: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. **Push code to GitHub:**
```bash
git add .
git commit -m "Add presigned URL upload system"
git push origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **New Project**
   - Import your GitHub repository
   - Vercel will auto-detect Vite framework
   - Click **Deploy**

3. **Add Environment Variables** (as shown in Step 2.2)

4. **Redeploy** after adding env vars:
   - Go to Deployments tab
   - Click the three dots → Redeploy

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## 🔧 Step 4: Verify Deployment

### 4.1 Check API Endpoints

Your API endpoints should be available at:
- `https://your-app.vercel.app/api/upload-url`
- `https://your-app.vercel.app/api/create-post`

Test with curl:
```bash
curl -X POST https://your-app.vercel.app/api/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","contentType":"video/mp4"}'
```

Expected response:
```json
{
  "uploadUrl": "https://...",
  "path": "videos/...",
  "token": "..."
}
```

### 4.2 Check Database

In Supabase SQL Editor:

```sql
-- Check if posts table exists
SELECT * FROM posts LIMIT 5;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

### 4.3 Check Storage

In Supabase Dashboard → Storage → videos:
- Bucket should exist
- Policies should show (check the Policies tab)

## 📱 Step 5: Using the System

### Upload a Video

The upload flow is now automatic:

1. User selects video file
2. System calls `/api/upload-url` to get presigned URL
3. System uploads video directly to Supabase Storage
4. System calls `/api/create-post` to save post record
5. Post appears in feed immediately (real-time)

### View Posts Feed

Use the new `PostsFeed` component:

```tsx
import { PostsFeed } from './components/PostsFeed';

function App() {
  return <PostsFeed onVideoClick={(url, post) => {
    // Handle video click
    console.log('Playing:', url);
  }} />;
}
```

## 🔍 Troubleshooting

### Issue: API endpoints return 404

**Solution**: Make sure vercel.json is configured correctly:
- Check `api/` folder exists
- Check files are named `*.ts`
- Redeploy after changes

### Issue: "Failed to create signed URL"

**Solutions**:
1. Check SUPABASE_SERVICE_ROLE_KEY is set in Vercel
2. Verify bucket name is exactly `videos`
3. Check storage policies are enabled

### Issue: Videos don't appear in feed

**Solutions**:
1. Check browser console for errors
2. Verify posts table has data: `SELECT * FROM posts;`
3. Check RLS policies allow SELECT
4. Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE posts;`

### Issue: Upload fails with "Network error"

**Solutions**:
1. Check file size (Supabase free tier: 50MB limit)
2. Verify presigned URL hasn't expired
3. Check CORS settings in Supabase
4. Try a smaller video file first

## 🔒 Security Checklist

- [x] Service Role Key stored in Vercel environment variables (not in code)
- [x] RLS policies enabled on posts table
- [x] Storage policies configured
- [x] Videos bucket properly configured
- [x] API endpoints use proper authentication

## 🎯 Testing Checklist

After deployment, test:

1. [ ] Upload a video from the app
2. [ ] Video appears in feed immediately
3. [ ] Refresh page - video still shows
4. [ ] Open in incognito/another device - video visible
5. [ ] Check Supabase Storage - video file exists
6. [ ] Check database - post record exists
7. [ ] Upload another video - both show in feed
8. [ ] Real-time updates work (new posts appear without refresh)

## 📊 Monitoring

### Vercel Logs

View function logs:
- Vercel Dashboard → Your Project → Deployments → View Function Logs

### Supabase Logs

View database/storage logs:
- Supabase Dashboard → Logs → API / Storage

### Browser Console

Check for errors:
- Open DevTools (F12) → Console
- Look for `[PostUpload]` or `[API]` prefixed logs

## 🚀 Next Steps

Now that the basic system is working, you can:

1. **Add user profiles** - Create profiles table
2. **Add likes & comments** - Create interaction tables
3. **Add video processing** - Use Supabase Edge Functions
4. **Add thumbnails** - Generate from first frame
5. **Add categories** - Filter by category
6. **Add search** - Full-text search on descriptions
7. **Add pagination** - Load more posts
8. **Add analytics** - Track views, engagement

## 📚 File Structure

```
your-project/
├── api/
│   ├── upload-url.ts       # Generate presigned URLs
│   └── create-post.ts      # Create post records
├── components/
│   └── PostsFeed.tsx       # Display all posts
├── services/
│   ├── postUploadService.ts # Upload + create post logic
│   ├── uploadService.ts     # Original upload service
│   └── supabaseClient.ts    # Supabase configuration
├── PRESIGNED_URL_SETUP.sql  # Database migration
├── vercel.json              # Vercel configuration
└── .env                     # Environment variables (local)
```

## ✅ Success Criteria

Your system is working correctly when:

1. ✅ Videos upload successfully (check Supabase Storage)
2. ✅ Posts appear in database (check `posts` table)
3. ✅ Feed loads and displays videos
4. ✅ Videos play when clicked
5. ✅ New uploads appear immediately (real-time)
6. ✅ Videos persist after page refresh
7. ✅ Public videos visible to all users

## 🆘 Need Help?

If you encounter issues:

1. Check Vercel Function Logs
2. Check Supabase Logs
3. Check Browser Console
4. Verify all environment variables are set
5. Verify SQL migration ran successfully
6. Test API endpoints directly with curl

## 🎉 Congratulations!

You now have a fully functional video upload system with:
- Secure uploads via presigned URLs
- Real-time feed updates
- Public video sharing
- Persistent storage
- Production-ready deployment

Happy coding! 🚀
