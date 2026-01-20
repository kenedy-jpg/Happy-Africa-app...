#!/bin/bash

# Direct Presigned URL Upload Test
# Use this to test uploads outside of the app

echo "🔗 Presigned URL Upload Tester"
echo "=============================="
echo ""

# Check for test video
if [ ! -f "test-video.mp4" ] && [ ! -f "sample.mp4" ]; then
    echo "❌ No test video found!"
    echo ""
    echo "Create a test video:"
    echo "  Option 1: Use any MP4 file and rename to test-video.mp4"
    echo "  Option 2: Generate with ffmpeg:"
    echo "    ffmpeg -f lavfi -i testsrc=duration=10:size=1280x720:rate=30 -pix_fmt yuv420p test-video.mp4"
    echo ""
    exit 1
fi

TEST_VIDEO="test-video.mp4"
[ -f "sample.mp4" ] && TEST_VIDEO="sample.mp4"

echo "📹 Using video: $TEST_VIDEO"
FILE_SIZE=$(du -h "$TEST_VIDEO" | cut -f1)
echo "📦 Size: $FILE_SIZE"
echo ""

# Instructions to get presigned URL
echo "📋 Steps to get presigned URL:"
echo ""
echo "1. Open your browser console (F12)"
echo "2. Navigate to your app (http://localhost:5173)"
echo "3. Log in"
echo "4. Run this in console:"
echo ""
echo "const { supabase } = await import('./services/supabaseClient.ts');"
echo "const fileName = 'test-' + Date.now() + '.mp4';"
echo "const { data, error } = await supabase.storage"
echo "  .from('videos')"
echo "  .createSignedUploadUrl(fileName);"
echo "console.log('Presigned URL:', data.signedUrl);"
echo ""
echo "5. Copy the presigned URL"
echo "6. Paste it here:"
echo ""
read -p "Presigned URL: " PRESIGNED_URL

if [ -z "$PRESIGNED_URL" ]; then
    echo "❌ No URL provided"
    exit 1
fi

echo ""
echo "🚀 Starting upload..."
echo ""

# Perform upload
curl -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: video/mp4" \
  --upload-file "$TEST_VIDEO" \
  -w "\n\nStatus: %{http_code}\nTime: %{time_total}s\nSpeed: %{speed_upload} bytes/s\n" \
  -v \
  --progress-bar

CURL_EXIT=$?

echo ""
if [ $CURL_EXIT -eq 0 ]; then
    echo "✅ Upload completed!"
else
    echo "❌ Upload failed (exit code: $CURL_EXIT)"
fi

echo ""
echo "📊 What the response means:"
echo "  200 OK       → Success! Video uploaded"
echo "  403 Forbidden → Invalid/expired presigned URL"
echo "  500 Error    → Server error (this is the issue we're fixing)"
echo "  Connection errors → Network/firewall issue"
echo ""
