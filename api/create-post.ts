import { createClient } from "@supabase/supabase-js";

// Vercel serverless function for creating post records after successful upload
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { videoPath, userId, description, category, visibility } = req.body;

    if (!videoPath || !userId) {
      return res.status(400).json({ error: "videoPath and userId required" });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "https://mlgxgylvndtvyqrdfvlw.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    console.log("[API] 💾 Creating post record for:", videoPath);

    // Insert post record (optimized - single query)
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        video_path: videoPath,
        description: description || "",
        category: category || "comedy",
        visibility: visibility || "public"
      })
      .select()
      .single();

    if (error) {
      console.error("[API] ❌ Error creating post:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("[API] ✅ Post created! ID:", post.id);

    return res.status(200).json({ post });
  } catch (error: any) {
    console.error("[API] Unexpected error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
