# Video Upload Error Fix Guide

## Issue: "Unable to save video to database. Code: N/A, Status: N/A"

This error occurs when the Supabase connection is not properly configured or RLS policies are blocking inserts.

## Quick Fix Steps

### Step 1: Configure Environment Variables

1. **Copy the example file** (if you don't have `.env` yet):
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your Supabase credentials**:
   - Go to: https://app.supabase.com/project/_/settings/api
   - Copy your **Project URL** and **anon/public key**
   - Update the `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

### Step 2: Fix Database Permissions

1. **Go to your Supabase dashboard**: https://app.supabase.com
2. **Navigate to**: SQL Editor
3. **Run the RLS fix script**: Copy and paste the contents of `FIX_RLS_POLICIES.sql`
4. **Execute the query**

### Step 3: Verify the Fix

1. **Log out and log back in** to your app
2. **Try uploading a video again**
3. **Check browser console** for any errors

## Common Issues

### Issue 1: "Authentication required"
**Solution**: Make sure you're logged in. Clear localStorage and log in again.

### Issue 2: "RLS policy violation"
**Solution**: Run the `FIX_RLS_POLICIES.sql` script in Supabase SQL Editor.

### Issue 3: "Videos table does not exist"
**Solution**: Run the database setup scripts:
1. `supabase_schema.sql` - Creates tables
2. `FIX_RLS_POLICIES.sql` - Sets permissions

### Issue 4: Still not working?

Run the built-in diagnostics:
```javascript
// In browser console:
import { uploadDiagnostics } from './services/uploadDiagnostics';
const result = await uploadDiagnostics.runFullDiagnostic();
console.log(result);
```

## Server-Side Upload Alternative

If client-side uploads continue to fail, you can set up server-side uploads:

1. **Create a server-side Supabase client** with service role key
2. **Add upload endpoint** to your Express server
3. **Update the Upload component** to use the server endpoint

See `server/index.js` for the existing server setup.

## Need More Help?

- Check `DATABASE_SETUP.md` for full database setup instructions
- Check `DEPLOYMENT_NOTES.md` for deployment configuration
- Review Supabase logs: https://app.supabase.com/project/_/logs
