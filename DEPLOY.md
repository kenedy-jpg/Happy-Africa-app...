# ⚡ Quick Deploy to Vercel

## 🚀 One-Command Deploy

```bash
# Option 1: Use deployment script
./deploy.sh

# Option 2: Manual commands
npm run build
vercel --prod
```

---

## 📋 Before You Deploy

### 1. Have Ready:
- ✅ Supabase project URL
- ✅ Supabase anon key
- ✅ GitHub account connected to Vercel

### 2. Get Supabase Credentials:
```
1. Go to https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy:
   - Project URL
   - Anon/Public key
```

---

## 🌐 Deploy Methods

### Method A: Vercel Dashboard (No CLI needed)

1. Go to https://vercel.com
2. Click **"New Project"**
3. Import `kenedy-jpg/Happy-Africa-app...`
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your-supabase-url
   - `VITE_SUPABASE_ANON_KEY` = your-anon-key
5. Click **"Deploy"**
6. Wait 2-3 minutes
7. Done! 🎉

### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Add env vars in dashboard after first deploy
```

### Method C: Automated Script

```bash
# Run the deployment script
./deploy.sh

# Follow the prompts
# Script will:
# - Test build
# - Commit changes
# - Push to GitHub
# - Deploy to Vercel
```

---

## ⚙️ Configure After Deploy

### 1. Add Environment Variables (if not done)

Vercel Dashboard → Your Project → **Settings** → **Environment Variables**:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key
```

**Important:** Redeploy after adding env vars!

### 2. Update Supabase URLs

Supabase Dashboard → **Authentication** → **URL Configuration**:

```
Site URL: https://your-app.vercel.app
Redirect URLs:
  - https://your-app.vercel.app/**
```

---

## ✅ Verify Deployment

Test your live app:

```bash
# Get your deployment URL from Vercel
# Open in browser and test:

1. ✅ App loads
2. ✅ Can sign up/login
3. ✅ Can upload video (file)
4. ✅ Can upload video (URL)
5. ✅ Videos show in feed
6. ✅ Refresh works
```

---

## 🐛 Quick Fixes

### "Environment variables undefined"
```bash
# Add in Vercel Dashboard → Settings → Environment Variables
# Then redeploy:
vercel --prod
```

### "Build failed"
```bash
# Test locally first:
npm run build

# Fix any errors, then:
git add .
git commit -m "fix: build errors"
git push origin main
# Vercel auto-deploys on push
```

### "Videos not uploading"
```bash
# Run in Supabase SQL Editor:
# Copy from: COMPLETE_VIDEO_SYSTEM_SETUP.sql
```

---

## 🔄 Update Your Live App

```bash
# Make changes locally
# Test:
npm run dev

# Deploy:
git add .
git commit -m "feat: your changes"
git push origin main

# Vercel auto-deploys in 2-3 minutes
```

---

## 📊 Monitor Your App

**Vercel Dashboard** → Your Project:

- **Analytics**: User traffic
- **Logs**: Error tracking  
- **Deployments**: Build history
- **Settings**: Configuration

---

## 💡 Pro Tips

### Faster Builds
Already optimized! Build time: ~5 seconds

### Custom Domain
Vercel Dashboard → **Domains** → Add your domain

### Preview Deployments
Every GitHub branch gets its own preview URL automatically!

### Rollback
Vercel Dashboard → **Deployments** → Click old deployment → **Promote to Production**

---

## 🎉 You're Live!

Your app is now deployed at:
```
https://your-app.vercel.app
```

Share with the world! 🌍

---

## 📞 Need Help?

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Video System**: See `VIDEO_SYSTEM_COMPLETE.md`
- **Quick Setup**: See `QUICK_SETUP.md`
