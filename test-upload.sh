#!/bin/bash

# Upload Test Script
# Tests the video upload functionality with various scenarios

echo "🎬 Video Upload Test Suite"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dev server is running
echo "📡 Checking dev server..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dev server is running"
else
    echo -e "${RED}✗${NC} Dev server is not running"
    echo "   Run: npm run dev"
    exit 1
fi

# Check Supabase connection
echo ""
echo "🗄️  Checking Supabase configuration..."
if [ -f ".env" ]; then
    if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✓${NC} Supabase configuration found"
    else
        echo -e "${RED}✗${NC} Missing Supabase configuration"
        echo "   Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  No .env file found"
fi

# Check for test video
echo ""
echo "🎥 Checking for test videos..."
TEST_VIDEO=""
if [ -f "test-video.mp4" ]; then
    TEST_VIDEO="test-video.mp4"
    echo -e "${GREEN}✓${NC} Found test-video.mp4"
elif [ -f "sample.mp4" ]; then
    TEST_VIDEO="sample.mp4"
    echo -e "${GREEN}✓${NC} Found sample.mp4"
else
    echo -e "${YELLOW}⚠${NC}  No test video found"
    echo "   You can create one with:"
    echo "   ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 -pix_fmt yuv420p test-video.mp4"
fi

# Test upload service exists
echo ""
echo "📦 Checking upload service..."
if [ -f "services/uploadService.ts" ]; then
    echo -e "${GREEN}✓${NC} Upload service exists"
    
    # Check for key functions
    if grep -q "uploadVideoWithPresignedUrl" services/uploadService.ts; then
        echo -e "${GREEN}✓${NC} Presigned URL upload function present"
    fi
    
    if grep -q "uploadVideoStandard" services/uploadService.ts; then
        echo -e "${GREEN}✓${NC} Standard upload fallback present"
    fi
    
    if grep -q "maxRetries" services/uploadService.ts; then
        echo -e "${GREEN}✓${NC} Retry logic implemented"
    fi
else
    echo -e "${RED}✗${NC} Upload service not found!"
    exit 1
fi

# Check backend integration
echo ""
echo "🔧 Checking backend integration..."
if grep -q "uploadService" services/backend.ts; then
    echo -e "${GREEN}✓${NC} Backend uses new upload service"
else
    echo -e "${YELLOW}⚠${NC}  Backend may not be using new upload service"
fi

# Manual test instructions
echo ""
echo "================================"
echo "✅ Pre-flight checks complete!"
echo "================================"
echo ""
echo "📋 Manual Testing Steps:"
echo ""
echo "1. Open browser to http://localhost:5173"
echo "2. Log in (create account if needed)"
echo "3. Click Upload/+ button"
echo "4. Select a video file (or record one)"
echo "5. Fill in description and details"
echo "6. Click 'POST NOW'"
echo ""
echo "🔍 What to watch for:"
echo ""
echo "  In Browser Console (F12):"
echo "    ${GREEN}[UploadService] Starting upload...${NC}"
echo "    ${GREEN}[UploadService] Creating presigned URL...${NC}"
echo "    ${GREEN}[Upload] Progress: { percent: ... }${NC}"
echo "    ${GREEN}[UploadService] Upload successful!${NC}"
echo ""
echo "  Progress indicators should show:"
echo "    • Upload percentage (0-100%)"
echo "    • Upload speed (MB/s)"
echo "    • Time remaining"
echo ""
echo "🧪 Test Scenarios:"
echo ""
echo "  1. Small video (< 10MB)"
echo "     Expected: Fast upload, single attempt"
echo ""
echo "  2. Medium video (50-100MB)"
echo "     Expected: ~30-60s, progress updates"
echo ""
echo "  3. Large video (> 100MB)"
echo "     Expected: Multiple minutes, may retry"
echo ""
echo "  4. Network interruption"
echo "     Action: Disable WiFi during upload"
echo "     Expected: Automatic retry after reconnection"
echo ""
echo "📊 Monitor Logs:"
echo ""
echo "  Supabase Dashboard → Logs → Storage"
echo "  Look for:"
echo "    POST /object/sign/videos/... → 200"
echo "    PUT /object/videos/... → 200"
echo ""
echo "🐛 Troubleshooting:"
echo ""
echo "  If uploads fail:"
echo "    1. Check browser console for errors"
echo "    2. Verify Supabase credentials in .env"
echo "    3. Check storage bucket policies (RLS)"
echo "    4. See UPLOAD_FIX_IMPLEMENTED.md"
echo ""
echo "Good luck! 🚀"
