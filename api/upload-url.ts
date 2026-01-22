import { createClient } from "@supabase/supabase-js";

// Vercel serverless function for generating presigned upload URLs
export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName and contentType required" });
    }

    // Initialize Supabase with service role key for admin access
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "https://mlgxgylvndtvyqrdfvlw.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    // Create unique path with timestamp
    const path = `videos/${Date.now()}-${fileName}`;

    console.log("[API] Creating presigned URL for:", path);

    // Create presigned upload URL (expires in 1 hour)
    const { data, error } = await supabase.storage
      .from("videos")
      .createSignedUploadUrl(path);

    if (error) {
      console.error("[API] Error creating signed URL:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("[API] Presigned URL created successfully");

    return res.status(200).json({
      uploadUrl: data.signedUrl,
      path: path,
      token: data.token
    });
  } catch (error: any) {
    console.error("[API] Unexpected error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
