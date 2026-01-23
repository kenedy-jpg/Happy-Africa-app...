import { createClient } from "@supabase/supabase-js";

// Vercel serverless function for generating presigned upload URLs
export default async function handler(req: any, res: any) {
  // Set CORS headers for mobile browsers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName and contentType required" });
    }

    // Get Supabase credentials with proper fallback
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://mlgxgylvndtvyqrdfvlw.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    // Debug: Log environment setup (without exposing full keys)
    console.log("[API] Environment check:", {
      hasViteUrl: !!process.env.VITE_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
      usingUrl: supabaseUrl.substring(0, 20) + "..."
    });

    if (!supabaseKey) {
      console.error("[API] ❌ CRITICAL: No Supabase credentials found!");
      console.error("[API] Required environment variables missing:");
      console.error("  - SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY");
      return res.status(500).json({ 
        error: "Server configuration error: Missing Supabase credentials",
        debug: "Add SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL to Vercel environment variables"
      });
    }

    // Initialize Supabase with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create unique path with timestamp and user ID
    const path = `videos/${Date.now()}-${fileName}`;

    console.log("[API] ⚡ Creating presigned URL for videos bucket:", path);

    // Create presigned upload URL (1 hour for faster mobile uploads)
    // Shorter expiry = faster URL generation
    const { data, error } = await supabase.storage
      .from("videos")
      .createSignedUploadUrl(path, {
        upsert: true // Allow overwrites if upload is retried
      });

    if (error) {
      console.error("[API] Error creating signed URL:", error);
      return res.status(500).json({ 
        error: error.message,
        code: (error as any).code 
      });
    }

    console.log("[API] ✓ Presigned URL created");

    return res.status(200).json({
      uploadUrl: data.signedUrl,
      path: path,
      token: data.token
    });
  } catch (error: any) {
    console.error("[API] Unexpected error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error",
      type: error.name 
    });
  }
}
