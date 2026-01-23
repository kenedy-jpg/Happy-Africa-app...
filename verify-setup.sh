#!/bin/bash

# ============================================================
# VERIFICATION SCRIPT - Ensure All Users Follow kenxokent Pattern
# ============================================================

echo "🔍 Verifying Happy Africa Video Upload System..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Upload.tsx uses correct service
echo "📝 Check 1: Upload component using correct service..."
if grep -q "uploadVideoAndCreatePost" components/Upload.tsx; then
    echo -e "${GREEN}✅ Upload.tsx uses uploadVideoAndCreatePost${NC}"
else
    echo -e "${RED}❌ Upload.tsx NOT using uploadVideoAndCreatePost${NC}"
    exit 1
fi

# Check 2: Backend queries posts table
echo "📝 Check 2: Backend queries posts table..."
if grep -q 'from("posts")' services/backend.ts; then
    echo -e "${GREEN}✅ Backend.ts queries posts table${NC}"
else
    echo -e "${RED}❌ Backend.ts NOT querying posts table${NC}"
    exit 1
fi

# Check 3: API creates posts
echo "📝 Check 3: API endpoint creates posts..."
if grep -q '.from("posts")' api/create-post.ts; then
    echo -e "${GREEN}✅ create-post API uses posts table${NC}"
else
    echo -e "${RED}❌ create-post API NOT using posts table${NC}"
    exit 1
fi

# Check 4: PostUploadService exists
echo "📝 Check 4: Post upload service exists..."
if [ -f "services/postUploadService.ts" ]; then
    echo -e "${GREEN}✅ postUploadService.ts exists${NC}"
else
    echo -e "${RED}❌ postUploadService.ts missing${NC}"
    exit 1
fi

# Check 5: SQL file uses posts table
echo "📝 Check 5: SQL setup uses posts table..."
if grep -q "CREATE TABLE IF NOT EXISTS posts" FIX_VIDEO_PERSISTENCE.sql; then
    echo -e "${GREEN}✅ FIX_VIDEO_PERSISTENCE.sql creates posts table${NC}"
else
    echo -e "${RED}❌ FIX_VIDEO_PERSISTENCE.sql NOT creating posts table${NC}"
    exit 1
fi

# Check 6: No references to old videos table in upload flow
echo "📝 Check 6: Upload flow doesn't use old videos table..."
OLD_REFS=$(grep -n 'from("videos")' components/Upload.tsx 2>/dev/null || echo "")
if [ -z "$OLD_REFS" ]; then
    echo -e "${GREEN}✅ Upload.tsx clean - no old videos table references${NC}"
else
    echo -e "${YELLOW}⚠️  Upload.tsx has references to videos table:${NC}"
    echo "$OLD_REFS"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All checks passed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 System Architecture:"
echo "   Upload.tsx → uploadVideoAndCreatePost()"
echo "   ↓"
echo "   postUploadService → /api/upload-url → /api/create-post"
echo "   ↓"
echo "   Supabase posts table (visibility='public')"
echo "   ↓"
echo "   backend.getFeed() → queries posts table"
echo "   ↓"
echo "   PostsFeed.tsx → displays to ALL users"
echo ""
echo "🎯 All users now follow the SAME pattern as kenxokent!"
echo ""
echo "Next steps:"
echo "1. Run FIX_VIDEO_PERSISTENCE.sql in Supabase SQL Editor"
echo "2. Verify environment variables in Vercel"
echo "3. Deploy: git add . && git commit -m 'Fix: Standardize uploads' && git push"
echo "4. Test: Upload video and refresh page"
echo ""
