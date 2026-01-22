# 🚀 Deploy Happy Africa to Vercel

## ✅ Prerequisites

- GitHub account
- Vercel account (free tier works!)
- Supabase project set up

---

## 📦 Step 1: Prepare Your Repository

### 1.1 Ensure .gitignore is correct

Your `.gitignore` already excludes:
- ✅ `.env` (secrets)
- ✅ `node_modules`
- ✅ `dist` (build output)

### 1.2 Commit your changes

```bash
git add .
git commit -m "feat: complete video system with URL upload"
git push origin main
```

---

## 🔧 Step 2: Configure Environment Variables

You'll need these from your Supabase project:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
```

---

## 🌐 Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository: `kenedy-jpg/Happy-Africa-app...`
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   - Click **"Environment Variables"**
   - Add `VITE_SUPABASE_URL` = `your-url-here`
   - Add `VITE_SUPABASE_ANON_KEY` = `your-key-here`

6. Click **"Deploy"**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? happy-africa-app
# - Which directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted

# Deploy to production
vercel --prod
```

---

## 🔗 Step 4: Configure Supabase for Production

### 4.1 Add Vercel Domain to Supabase

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URLs:
   ```
   Site URL: https://your-app.vercel.app
   Redirect URLs: 
   - https://your-app.vercel.app
   - https://your-app.vercel.app/**
   ```

### 4.2 Enable CORS

Go to **Settings** → **API** → Add your Vercel domain to allowed origins.

---

## ✅ Step 5: Verify Deployment

### Test these features:

1. **Home Page Loads**: ✅ App opens without errors
2. **Authentication**: ✅ Can sign up/login
3. **Video Upload**: ✅ Can upload videos (file + URL)
4. **Video Feed**: ✅ Videos appear and play
5. **Real-time**: ✅ New videos appear instantly
6. **Profile**: ✅ User profile shows uploaded videos
7. **Persistence**: ✅ Refresh works, videos remain

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Cannot resolve module"**
```bash
# Install missing dependencies
npm install
npm run build
```

**Error: "Environment variables not defined"**
- Add env vars in Vercel Dashboard → Settings → Environment Variables
- Redeploy

### Videos Don't Upload

**Check Supabase Storage:**
1. Verify `videos` bucket exists
2. Run `COMPLETE_VIDEO_SYSTEM_SETUP.sql` if not done
3. Check RLS policies are active

### CORS Errors

Add your Vercel domain to:
1. Supabase → Settings → API → CORS
2. Supabase → Authentication → URL Configuration

---

## 🎯 Post-Deployment Checklist

- [ ] App loads at your Vercel URL
- [ ] Users can sign up/login
- [ ] Videos can be uploaded (file)
- [ ] Videos can be uploaded (URL)
- [ ] Feed shows all videos
- [ ] Real-time updates work
- [ ] Profile shows user videos
- [ ] Videos persist after refresh
- [ ] Mobile responsive works
- [ ] No console errors

---

## 🔧 Advanced: Custom Domain

### Add Custom Domain to Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your domain: `happyafrica.com`
3. Add DNS records (Vercel will show you):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. Update Supabase URLs with your custom domain

---

## 📊 Monitoring

### Vercel Analytics

Enable in: Dashboard → Project → **Analytics** (free plan included)

Shows:
- Page views
- Unique visitors
- Top pages
- Geographic distribution

### Logs

View deployment logs:
- Dashboard → Project → **Deployments** → Click deployment → **Function Logs**

---

## 🚀 Continuous Deployment

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Vercel automatically builds and deploys
# Check: https://vercel.com/dashboard
```

---

## 💡 Performance Tips

### 1. Enable Edge Functions
Vercel serves from global CDN automatically

### 2. Optimize Images
Add to `vite.config.ts`:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'supabase': ['@supabase/supabase-js']
      }
    }
  }
}
```

### 3. Add Loading States
Already implemented in components

---

## 🔐 Security Best Practices

✅ **Already Configured:**
- Environment variables not in code
- RLS policies protect database
- Presigned URLs for secure uploads
- HTTPS enforced by Vercel

---

## 📈 Scaling

Vercel free tier includes:
- Unlimited bandwidth
- 100GB-hours compute
- Automatic scaling
- Global CDN

For high traffic, upgrade to Pro:
- More compute time
- Advanced analytics
- Team collaboration

---

## 🎉 You're Live!

Your Happy Africa app is now:
- 🌍 **Globally distributed** via Vercel CDN
- ⚡ **Fast** with edge optimization
- 🔒 **Secure** with HTTPS and RLS
- 📱 **Mobile-ready** and responsive
- 🔄 **Auto-deploying** from GitHub

Share your app: `https://your-app.vercel.app` 🚀

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: Report bugs in your repo

---

## 🔄 Updates

To deploy updates:
```bash
git add .
git commit -m "your message"
git push origin main
```

Vercel deploys automatically in ~2 minutes!
