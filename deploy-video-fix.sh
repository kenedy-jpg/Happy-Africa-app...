#!/bin/bash
# Quick deployment script for video persistence fix

echo "🎬 Deploying Video Persistence Fix for All Users"
echo "================================================"
echo ""

# Step 1: Check for uncommitted changes
echo "📋 Step 1: Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo "✅ Found changes to commit"
else
  echo "⚠️  No changes found. Make sure you've applied the fixes."
  exit 1
fi

# Step 2: Show what changed
echo ""
echo "📝 Step 2: Files modified:"
git status -s
echo ""

# Step 3: Commit changes
echo "💾 Step 3: Committing changes..."
git add components/Upload.tsx services/backend.ts FIX_ALL_USERS_VIDEO_PERSISTENCE.sql FIX_APPLIED_ALL_USERS.md
git commit -m "Fix: Standardize video persistence on posts table for all users

- Update Upload.tsx to use uploadVideoAndCreatePost (posts table)
- Update backend.ts to query posts table instead of videos table
- Create comprehensive SQL setup for posts table with RLS policies
- Migrate existing videos from videos table to posts table
- Ensure all users' videos persist after refresh like kenxokent account

Fixes issue where only some users' videos were persisting."

echo "✅ Changes committed"
echo ""

# Step 4: Push to deploy
echo "🚀 Step 4: Pushing to trigger Vercel deployment..."
read -p "Push to main branch and deploy? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin main
  echo "✅ Pushed to GitHub - Vercel will deploy automatically"
else
  echo "⏸️  Deployment cancelled. Run 'git push origin main' when ready."
  exit 0
fi

echo ""
echo "================================================"
echo "✅ DEPLOYMENT INITIATED"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Go to Supabase Dashboard → SQL Editor"
echo "2. Run the script: FIX_ALL_USERS_VIDEO_PERSISTENCE.sql"
echo "3. Wait for Vercel deployment to complete"
echo "4. Test video upload and refresh from any account"
echo ""
echo "📚 Read FIX_APPLIED_ALL_USERS.md for full details"
echo ""
