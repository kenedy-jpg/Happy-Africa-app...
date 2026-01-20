#!/bin/bash

# Video Upload Diagnostic Script
# Run this script to diagnose upload issues

echo "================================================"
echo "Happy Africa - Upload Diagnostic Tool"
echo "================================================"
echo ""

# Check 1: Environment file exists
echo "✓ Checking environment configuration..."
if [ -f .env ]; then
    echo "  ✅ .env file found"
    
    # Check if it has the required variables
    if grep -q "VITE_SUPABASE_URL" .env && grep -q "VITE_SUPABASE_ANON_KEY" .env; then
        echo "  ✅ Required environment variables present"
        
        # Check if they're not just placeholders
        if grep -q "your-project-url-here" .env || grep -q "your-anon-key-here" .env; then
            echo "  ⚠️  WARNING: Environment variables contain placeholder values"
            echo "      Update .env with your actual Supabase credentials"
        else
            echo "  ✅ Environment variables configured"
        fi
    else
        echo "  ❌ Missing required environment variables"
        echo "      Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env"
    fi
else
    echo "  ❌ .env file not found"
    echo "      Copy .env.example to .env and configure it"
fi

echo ""

# Check 2: Node modules installed
echo "✓ Checking dependencies..."
if [ -d node_modules ]; then
    echo "  ✅ node_modules directory found"
    
    # Check for Supabase package
    if [ -d node_modules/@supabase ]; then
        echo "  ✅ Supabase packages installed"
    else
        echo "  ⚠️  Supabase packages not found"
        echo "      Run: npm install"
    fi
else
    echo "  ❌ node_modules not found"
    echo "      Run: npm install"
fi

echo ""

# Check 3: Server status
echo "✓ Checking development server..."
if pgrep -f "vite" > /dev/null; then
    echo "  ✅ Development server is running"
    echo "      If you just updated .env, restart the server:"
    echo "      1. Stop the server (Ctrl+C)"
    echo "      2. Run: npm run dev"
else
    echo "  ⚠️  Development server not running"
    echo "      Start it with: npm run dev"
fi

echo ""

# Check 4: Database files
echo "✓ Checking database setup files..."
if [ -f FIX_RLS_POLICIES.sql ]; then
    echo "  ✅ RLS policy fix script found"
    echo "      Run this in Supabase SQL Editor if uploads fail"
else
    echo "  ⚠️  RLS policy script missing"
fi

if [ -f supabase_schema.sql ]; then
    echo "  ✅ Database schema found"
else
    echo "  ⚠️  Database schema missing"
fi

echo ""
echo "================================================"
echo "Next Steps:"
echo "================================================"
echo ""
echo "1. Fix any ❌ or ⚠️  issues above"
echo "2. Restart your dev server if you changed .env"
echo "3. Log out and log back into the app"
echo "4. Try uploading again"
echo ""
echo "For detailed instructions, see: UPLOAD_FIX_GUIDE.md"
echo "================================================"
