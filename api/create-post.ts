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

    console.log("[API] 💾 Updating video record with metadata:", videoPath);

    // First, try to find existing video record created by auto-save trigger
    const { data: existingVideos, error: selectError } = await supabase
      .from("videos")
      .select("id")
      .eq("url", videoPath)
      .limit(1);

    let post;
    let error;

    if (existingVideos && existingVideos.length > 0) {
      // Video record already exists from trigger - update with metadata
      const videoId = existingVideos[0].id;
      const { data: updated, error: updateError } = await supabase
        .from("videos")
        .update({
          user_id: userId,
          description: description || "",
          category: category || "comedy",
          is_published: true
        })
        .eq("id", videoId)
        .select()
        .single();
      
      post = updated;
      error = updateError;
      console.log("[API] ✅ Updated existing video record:", videoId);
    } else {
      // No trigger-created record found - create new one
      const { data: created, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          url: videoPath,
          media_url: videoPath,
          description: description || "",
          category: category || "comedy",
          is_published: true
        })
        .select()
        .single();
      
      post = created;
      error = insertError;
      console.log("[API] ✅ Created new video record");
    }

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
