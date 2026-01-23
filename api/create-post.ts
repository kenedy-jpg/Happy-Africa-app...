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
    const { videoPath, userId, description, category, visibility, postId, isPlaceholder } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "https://mlgxgylvndtvyqrdfvlw.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    );

    let post;
    let error;

    // 🚀 IMMEDIATE CREATION: Create placeholder video record (no file needed yet)
    if (isPlaceholder) {
      console.log("[API] 🚀 Creating PLACEHOLDER video record (instant appearance)...");
      const { data: created, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          url: '', // Empty until file is uploaded
          media_url: '',
          description: description || "",
          category: category || "comedy",
          is_published: true,
          visibility: visibility || 'public'
        })
        .select()
        .single();
      
      post = created;
      error = insertError;
      
      if (error) {
        console.error("[API] ❌ Error creating placeholder:", error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log("[API] ✅ PLACEHOLDER created! Video appears in feed IMMEDIATELY. ID:", post.id);
      return res.status(200).json({ post });
    }

    // 🔄 UPDATE PHASE: Video record exists, update with file path
    if (postId) {
      console.log("[API] 🔄 Updating video record with file path...");
      const { data: updated, error: updateError } = await supabase
        .from("videos")
        .update({
          url: videoPath || '',
          media_url: videoPath || '',
          description: description || "",
          category: category || "comedy",
          is_published: true,
          visibility: visibility || 'public'
        })
        .eq("id", postId)
        .select()
        .single();
      
      post = updated;
      error = updateError;
      
      if (error) {
        console.error("[API] ❌ Error updating post:", error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log("[API] ✅ Updated video with file. ID:", post.id);
      return res.status(200).json({ post });
    }

    // 🔗 FALLBACK: Find and update by videoPath (from auto-save trigger)
    if (videoPath) {
      console.log("[API] 🔗 Looking for existing record by path...");
      const { data: existingVideos, error: selectError } = await supabase
        .from("videos")
        .select("id")
        .eq("url", videoPath)
        .limit(1);

      if (existingVideos && existingVideos.length > 0) {
        // Record exists - update with metadata
        const videoId = existingVideos[0].id;
        const { data: updated, error: updateError } = await supabase
          .from("videos")
          .update({
            user_id: userId,
            description: description || "",
            category: category || "comedy",
            is_published: true,
            visibility: visibility || 'public'
          })
          .eq("id", videoId)
          .select()
          .single();
        
        post = updated;
        error = updateError;
        console.log("[API] ✅ Updated existing record by path. ID:", videoId);
      } else {
        // No record found - create new one
        const { data: created, error: insertError } = await supabase
          .from("videos")
          .insert({
            user_id: userId,
            url: videoPath,
            media_url: videoPath,
            description: description || "",
            category: category || "comedy",
            is_published: true,
            visibility: visibility || 'public'
          })
          .select()
          .single();
        
        post = created;
        error = insertError;
        console.log("[API] ✅ Created new record from path");
      }
    }

    if (error) {
      console.error("[API] ❌ Error with video record:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!post) {
      return res.status(400).json({ error: "Invalid request - postId or videoPath required" });
    }

    console.log("[API] ✅ Post complete! ID:", post.id);

    return res.status(200).json({ post });
  } catch (error: any) {
    console.error("[API] Unexpected error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
