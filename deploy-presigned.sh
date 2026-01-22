#!/bin/bash

# 🚀 Complete Deployment Script for Presigned URL Video Upload System
# This script deploys your app to Vercel with all necessary configurations

set -e  # Exit on any error

echo "=========================================="
echo "🚀 Happy Africa App - Deployment Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if we're in the right directory
echo -e "${YELLOW}📁 Checking directory...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Directory check passed${NC}"
echo ""

# Step 2: Check if required files exist
echo -e "${YELLOW}📋 Verifying required files...${NC}"
REQUIRED_FILES=("vercel.json" "api/upload-url.ts" "api/create-post.ts" "services/postUploadService.ts" "components/PostsFeed.tsx")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Missing required file: $file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Found: $file${NC}"
done
echo ""

# Step 3: Check environment variables
echo -e "${YELLOW}🔑 Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo -e "${YELLOW}   Make sure to set environment variables in Vercel Dashboard:${NC}"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
else
    echo -e "${GREEN}✅ .env file found${NC}"
    # Check if key variables are set
    if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✅ Required environment variables found in .env${NC}"
    else
        echo -e "${YELLOW}⚠️  Some environment variables may be missing in .env${NC}"
    fi
fi
echo ""

# Step 4: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 5: Build the project
echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Step 6: Check Vercel CLI
echo -e "${YELLOW}🔧 Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
else
    echo -e "${GREEN}✅ Vercel CLI is installed${NC}"
fi
echo ""

# Step 7: Deploy to Vercel
echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
echo ""
echo "Choose deployment option:"
echo "1. Deploy to production (vercel --prod)"
echo "2. Deploy preview (vercel)"
echo "3. Skip deployment (just build)"
echo ""
read -p "Enter option (1-3): " deploy_option

case $deploy_option in
    1)
        echo -e "${YELLOW}🚀 Deploying to production...${NC}"
        vercel --prod
        ;;
    2)
        echo -e "${YELLOW}🚀 Deploying preview...${NC}"
        vercel
        ;;
    3)
        echo -e "${YELLOW}⏭️  Skipping deployment${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo "=========================================="
echo ""

# Step 8: Post-deployment checklist
echo -e "${YELLOW}📋 POST-DEPLOYMENT CHECKLIST:${NC}"
echo ""
echo "1. ✅ Verify environment variables in Vercel Dashboard:"
echo "   https://vercel.com/[your-project]/settings/environment-variables"
echo ""
echo "2. ✅ Run database migration in Supabase SQL Editor:"
echo "   Copy and run: PRESIGNED_URL_SETUP.sql"
echo ""
echo "3. ✅ Check Supabase Storage bucket exists:"
echo "   Dashboard → Storage → 'videos' bucket"
echo ""
echo "4. ✅ Test API endpoints:"
echo "   curl -X POST https://[your-domain]/api/upload-url \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"fileName\":\"test.mp4\",\"contentType\":\"video/mp4\"}'"
echo ""
echo "5. ✅ Test upload in your app"
echo ""
echo "6. ✅ Check video appears in feed"
echo ""
echo -e "${GREEN}🎉 Your video upload system is ready!${NC}"
echo ""
echo "📚 For detailed setup instructions, see:"
echo "   - PRESIGNED_URL_DEPLOYMENT.md"
echo "   - IMPLEMENTATION_EXAMPLES.tsx"
echo ""
