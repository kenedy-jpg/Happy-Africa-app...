# Database Setup Guide for Happy Africa App

If you're experiencing "Failed to save video to database" errors, follow this guide to ensure your Supabase database is properly configured.

## 1. Create the Videos Table

Go to Supabase SQL Editor and run:

```sql
-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  video_url TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  duration INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reposted_from TEXT REFERENCES videos(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_videos_is_published ON videos(is_published);
```

## 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own videos
CREATE POLICY "Users can insert their own videos"
  ON videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
  ON videos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
  ON videos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow everyone to view published videos
CREATE POLICY "Anyone can view published videos"
  ON videos
  FOR SELECT
  USING (is_published = true OR auth.uid() = user_id);
```

## 3. Create Storage Bucket

1. Go to Supabase Storage
2. Create a new bucket named `videos`
3. Set it as Public (or configure CORS as needed)
4. Go to Policies and add:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload their own videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

-- Allow public access to view videos
CREATE POLICY "Public can view videos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'videos');
```

## 4. Test the Setup

The app includes a diagnostic tool that will:
- Check database connectivity
- Verify RLS policies
- Test insert permissions
- Check storage bucket exists

To manually test:

```bash
# In browser console while app is running:
await uploadDiagnostics.runFullDiagnostic()
```

## Common Issues

### "PGRST116 - Table not found"
- Solution: Run the CREATE TABLE script above

### "401 Unauthorized"
- Solution: Check your Supabase API key is correct
- Update `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`

### "Permission denied" on INSERT
- Solution: Check RLS policies using the SQL scripts above

### "Bucket not found"
- Solution: Create the `videos` bucket in Supabase Storage

## Debugging Steps

1. **Check Browser Console**: Look for detailed error messages with code and details
2. **Check Supabase Logs**: Go to Supabase dashboard → Logs to see database errors
3. **Run Diagnostic**: Use the built-in diagnostic tool to identify issues
4. **Test with cURL**: 
   ```bash
   curl -X GET https://your-supabase-url/rest/v1/videos \
     -H "Authorization: Bearer your-anon-key" \
     -H "apikey: your-anon-key"
   ```

## Support

If issues persist:
1. Verify all environment variables are set correctly
2. Check that your Supabase project hasn't reached its database limits
3. Ensure you're using the correct API key (anon, not service_role)
4. Check Supabase status page for any ongoing issues
