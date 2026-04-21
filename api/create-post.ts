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

    // Initialize Supabase with proper fallback
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mlgxgylvndtvyqrdfvlw.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    console.log('[API] Supabase config:', {
      url: supabaseUrl ? '✓ set' : '✗ missing',
      key: supabaseKey ? '✓ set' : '✗ missing'
    });

    if (!supabaseKey) {
      console.error('[API] ❌ Supabase key is not configured');
      return res.status(500).json({ error: "Server configuration error: Supabase key missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let post;
    let error;

    // 🚀 IMMEDIATE CREATION: Create placeholder video record (no file needed yet)
    if (isPlaceholder) {
      console.log("[API] 🚀 Creating PLACEHOLDER post record (instant appearance)...");
      const { data: created, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          video_path: '', // Empty until file is uploaded
          description: description || "",
          category: category || "comedy",
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
      
      console.log("[API] ✅ PLACEHOLDER created! Post appears in feed IMMEDIATELY. ID:", post.id);
      return res.status(200).json({ post });
    }

    // 🔄 UPDATE PHASE: Post record exists, update with file path
    if (postId) {
      console.log("[API] 🔄 Updating post record with file path...");
      const { data: updated, error: updateError } = await supabase
        .from("posts")
        .update({
          video_path: videoPath || '',
          description: description || "",
          category: category || "comedy",
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
      
      console.log("[API] ✅ Updated post with file. ID:", post.id);
      return res.status(200).json({ post });
    }

    // 🔗 FALLBACK: Find and update by videoPath (from auto-save trigger)
    if (videoPath) {
      console.log("[API] 🔗 Looking for existing record by path...");
      const { data: existingPosts, error: selectError } = await supabase
        .from("posts")
        .select("id")
        .eq("video_path", videoPath)
        .limit(1);

      if (existingPosts && existingPosts.length > 0) {
        // Record exists - update with metadata
        const postId = existingPosts[0].id;
        const { data: updated, error: updateError } = await supabase
          .from("posts")
          .update({
            user_id: userId,
            description: description || "",
            category: category || "comedy",
            visibility: visibility || 'public'
          })
          .eq("id", postId)
          .select()
          .single();
        
        post = updated;
        error = updateError;
        console.log("[API] ✅ Updated existing record by path. ID:", postId);
      } else {
        // No record found - create new one
        const { data: created, error: insertError } = await supabase
          .from("posts")
          .insert({
            user_id: userId,
            video_path: videoPath,
            description: description || "",
            category: category || "comedy",
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
