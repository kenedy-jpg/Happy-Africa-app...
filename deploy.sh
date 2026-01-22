#!/bin/bash

# 🚀 Deploy Happy Africa to Vercel
# This script helps you deploy your app step-by-step

set -e # Exit on error

echo "╔════════════════════════════════════════════╗"
echo "║   🚀 Happy Africa Vercel Deployment       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if git repo is clean
echo -e "${BLUE}📋 Step 1: Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes.${NC}"
    echo -e "${YELLOW}Would you like to commit them? (y/n)${NC}"
    read -r commit_changes
    if [[ "$commit_changes" == "y" ]]; then
        echo "Enter commit message:"
        read -r commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed${NC}"
    fi
else
    echo -e "${GREEN}✅ Git repository is clean${NC}"
fi
echo ""

# Step 2: Test build
echo -e "${BLUE}🔨 Step 2: Testing build...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Fix errors before deploying.${NC}"
    exit 1
fi
echo ""

# Step 3: Push to GitHub
echo -e "${BLUE}📤 Step 3: Pushing to GitHub...${NC}"
echo -e "${YELLOW}Push to GitHub? (y/n)${NC}"
read -r push_github
if [[ "$push_github" == "y" ]]; then
    git push origin main
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
else
    echo -e "${YELLOW}⏭️  Skipped GitHub push${NC}"
fi
echo ""

# Step 4: Check if Vercel CLI is installed
echo -e "${BLUE}🔍 Step 4: Checking Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Install it? (y/n)${NC}"
    read -r install_vercel
    if [[ "$install_vercel" == "y" ]]; then
        npm install -g vercel
        echo -e "${GREEN}✅ Vercel CLI installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Deploy manually at vercel.com${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}✅ Vercel CLI found${NC}"
fi
echo ""

# Step 5: Deploy to Vercel
echo -e "${BLUE}🚀 Step 5: Deploy to Vercel...${NC}"
echo ""
echo -e "${YELLOW}Choose deployment method:${NC}"
echo "1) Deploy to production (vercel --prod)"
echo "2) Deploy preview (vercel)"
echo "3) Skip (I'll deploy manually)"
read -r deploy_choice

case $deploy_choice in
    1)
        echo -e "${BLUE}Deploying to production...${NC}"
        vercel --prod
        ;;
    2)
        echo -e "${BLUE}Deploying preview...${NC}"
        vercel
        ;;
    3)
        echo -e "${YELLOW}⏭️  Skipped deployment${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Deployment Complete!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Check your deployment at the URL shown above"
echo "2. Add environment variables if first deployment:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "3. Configure Supabase redirect URLs"
echo "4. Test video upload and feed"
echo ""
echo -e "${BLUE}📚 Full guide: ${NC}./DEPLOYMENT_GUIDE.md"
echo ""
