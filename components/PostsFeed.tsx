import React, { useState, useEffect } from 'react';
import { Video, RefreshCw, Loader } from 'lucide-react';
import { fetchAllPosts, getVideoPublicUrl, subscribeToNewPosts } from '../services/postUploadService';

interface PostsFeedProps {
  onVideoClick?: (videoUrl: string, post: any) => void;
}

export const PostsFeed: React.FC<PostsFeedProps> = ({ onVideoClick }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial posts
  useEffect(() => {
    loadPosts();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToNewPosts((newPost) => {
      console.log('[PostsFeed] New post added:', newPost);
      setPosts((prev) => [newPost, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPosts(50, 0);
      console.log('[PostsFeed] Loaded posts:', data.length);
      setPosts(data);
    } catch (error) {
      console.error('[PostsFeed] Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-brand-pink mx-auto mb-4" />
          <p className="text-white/60">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center p-6">
          <Video className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 text-lg mb-2">No posts yet</p>
          <p className="text-white/40 text-sm">Be the first to upload!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-brand-indigo border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-white font-black text-xl uppercase tracking-wide">
          News Feed
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-white active:opacity-50 transition-opacity"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-1">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={() => {
              const videoUrl = getVideoPublicUrl(post.video_path);
              onVideoClick?.(videoUrl, post);
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface PostCardProps {
  post: any;
  onClick: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onClick }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Generate thumbnail from video
    const generateThumbnail = async () => {
      try {
        const videoUrl = getVideoPublicUrl(post.video_path);
        setThumbnailUrl(videoUrl);
      } catch (error) {
        console.error('[PostCard] Failed to load video:', error);
      }
    };

    generateThumbnail();
  }, [post.video_path]);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div
      className="relative aspect-[9/16] bg-gray-900 cursor-pointer group overflow-hidden"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Preview */}
      <video
        ref={videoRef}
        src={thumbnailUrl}
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
        preload="metadata"
      />

      {/* Overlay Info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* User Info */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center text-white text-sm font-bold">
              {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                @{post.profiles?.username || 'user'}
              </p>
            </div>
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-white/90 text-sm line-clamp-2 mb-2">
              {post.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-white/60 text-xs">
            <span className="capitalize">{post.category}</span>
            <span>•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Play Icon (shows when not playing) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
