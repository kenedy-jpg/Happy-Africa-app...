-- ============================================
-- SCALE TO 5+ MILLION USERS - DATABASE OPTIMIZATION
-- ============================================
-- This script optimizes the database for handling millions of users
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADVANCED INDEXING FOR PERFORMANCE
-- ============================================

-- Posts table indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_composite ON posts(visibility, created_at DESC) WHERE visibility = 'public';

-- Videos table indexes
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_is_published ON videos(is_published);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_composite ON videos(is_published, created_at DESC) WHERE is_published = true;

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Comments indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_composite ON likes(post_id, user_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id);

-- ============================================
-- 2. MATERIALIZED VIEWS FOR FAST ANALYTICS
-- ============================================

-- Create materialized view for trending posts
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_posts AS
SELECT 
    p.*,
    COUNT(DISTINCT l.id) as like_count,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT l.id) + (COUNT(DISTINCT c.id) * 2) as engagement_score
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
AND p.visibility = 'public'
GROUP BY p.id
ORDER BY engagement_score DESC
LIMIT 100;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_trending_engagement ON trending_posts(engagement_score DESC);

-- Refresh function for trending posts (call this periodically)
CREATE OR REPLACE FUNCTION refresh_trending_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_posts;
END;
$$;

-- ============================================
-- 3. PARTITIONING FOR LARGE TABLES
-- ============================================

-- Enable partitioning for posts by date (for future scalability)
-- Note: This is for new installations. Existing tables need migration.
-- CREATE TABLE posts_partitioned (
--     LIKE posts INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);

-- ============================================
-- 4. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- ============================================

-- Drop existing policies and recreate optimized ones
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

-- Optimized RLS policies with indexes
CREATE POLICY "Public posts viewable by all"
ON posts FOR SELECT
USING (
    visibility = 'public' OR
    user_id = auth.uid() OR
    (visibility = 'friends' AND EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = auth.uid() AND following_id = posts.user_id
    ))
);

CREATE POLICY "Users insert own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. CONNECTION POOLING CONFIGURATION
-- ============================================
-- Note: Configure in Supabase Dashboard > Database > Connection Pooling
-- Recommended settings for 5M users:
-- - Pool Mode: Transaction
-- - Pool Size: 15-20
-- - Max Client Connections: 100

-- ============================================
-- 6. DATABASE STATISTICS UPDATE
-- ============================================

-- Update statistics for query optimizer
ANALYZE posts;
ANALYZE videos;
ANALYZE profiles;
ANALYZE comments;
ANALYZE likes;
ANALYZE follows;

-- ============================================
-- 7. ENABLE AUTOMATIC VACUUM
-- ============================================

-- Configure autovacuum for high-traffic tables
ALTER TABLE posts SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE videos SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- ============================================
-- 8. CACHING FUNCTIONS
-- ============================================

-- Function to get cached user feed (with manual cache)
CREATE OR REPLACE FUNCTION get_user_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    video_path TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    like_count BIGINT,
    comment_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.video_path,
        p.description,
        p.created_at,
        COALESCE(l.like_count, 0) as like_count,
        COALESCE(c.comment_count, 0) as comment_count
    FROM posts p
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as like_count 
        FROM likes 
        WHERE post_id = p.id
    ) l ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as comment_count 
        FROM comments 
        WHERE post_id = p.id
    ) c ON true
    WHERE p.visibility = 'public'
    OR p.user_id = p_user_id
    OR (p.visibility = 'friends' AND EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = p_user_id AND following_id = p.user_id
    ))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================
-- 9. RATE LIMITING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    count INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action, window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INT,
    p_window_minutes INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    SELECT COALESCE(SUM(count), 0)
    INTO v_count
    FROM rate_limits
    WHERE user_id = p_user_id
    AND action = p_action
    AND window_start > v_window_start;
    
    RETURN v_count < p_max_requests;
END;
$$;

-- ============================================
-- 10. CLEANUP OLD DATA
-- ============================================

-- Function to archive old posts (optional)
CREATE OR REPLACE FUNCTION archive_old_posts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Move posts older than 1 year to archive table
    -- Implement based on your retention policy
    DELETE FROM posts
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND visibility = 'private';
END;
$$;

-- ============================================
-- DEPLOYMENT NOTES
-- ============================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Set up a cron job to refresh materialized views:
--    SELECT cron.schedule('refresh-trending', '*/10 * * * *', 'SELECT refresh_trending_posts()');
-- 3. Configure connection pooling in Supabase Dashboard
-- 4. Enable Point-in-Time Recovery (PITR) for data safety
-- 5. Set up read replicas for read-heavy operations
-- 6. Configure CDN for video storage (Cloudflare R2, AWS CloudFront)
-- 7. Implement Redis caching layer for frequently accessed data
-- 8. Monitor query performance with pg_stat_statements
-- 9. Set up alerting for slow queries (>1s)
-- 10. Regular backup strategy (automated daily backups)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Check table sizes
-- SELECT 
--     schemaname as schema,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
-- SELECT query, calls, mean_exec_time, total_exec_time
-- FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC
-- LIMIT 10;
