import React, { useState, useEffect, useRef, useTransition } from 'react';
import { VideoCard } from './VideoCard';
import { Video, FeedType, PageRoute } from '../types';
import { backend } from '../services/backend';
import { supabase } from '../services/supabaseClient';
import { ChevronLeft, Loader, Video as VideoIcon, RefreshCw } from 'lucide-react';

interface VideoFeedProps {
  onOpenComments: (videoId: string) => void;
  onOpenShare: (video: Video) => void;
  onOpenGift: () => void;
  onRequireAuth: (cb: () => void) => void;
  isLoggedIn: boolean;
  type: FeedType | 'custom';
  initialVideos?: Video[];
  initialIndex?: number;
  onNavigate?: (route: PageRoute) => void;
  onBack?: () => void;
  isFeedVisible?: boolean; 
  likedVideoIds?: Set<string>;
  onToggleLike?: (videoId: string) => void;
  addedCommentCounts?: Record<string, number>; 
  followedUserIds?: Set<string>;
  onToggleFollow?: (userId: string) => void;
  bookmarkedVideoIds?: Set<string>;
  onToggleBookmark?: (videoId: string) => void;
  isDataSaver?: boolean;
  refreshTrigger?: number;
  onOpenLocation?: (locationName: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({ 
  onOpenComments, 
  onOpenShare, 
  onOpenGift, 
  onRequireAuth, 
  isLoggedIn, 
  type, 
  initialVideos, 
  initialIndex = 0, 
  onNavigate, 
  onBack, 
  isFeedVisible = true,
  likedVideoIds, 
  onToggleLike, 
  addedCommentCounts, 
  followedUserIds, 
  onToggleFollow, 
  bookmarkedVideoIds, 
  onToggleBookmark, 
  isDataSaver = false,
  refreshTrigger = 0,
  onOpenLocation,
  isMuted,
  onToggleMute
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isFirstRun = useRef(true);

  const loadVideos = async () => {
    if (type === 'custom') return;
    
    setLoading(true);
    try {
        const feedData = await backend.content.getFeed(type as FeedType, 0, 20);
        
        if (!feedData || feedData.length === 0) {
            console.warn("[Feed] No videos returned from backend.");
        }

        setVideos(feedData);
    } catch (e: any) {
        // Log the actual object for DevTools inspection
        console.error("[Feed] DB Load Error Context:", e);
        
        // Extract a human-readable message
        let errorMessage = "Unknown error";
        if (e?.message) errorMessage = e.message;
        else if (e?.error_description) errorMessage = e.error_description;
        else if (typeof e === 'string') errorMessage = e;
        else {
            try {
                errorMessage = JSON.stringify(e);
                if (errorMessage === "{}") errorMessage = String(e);
            } catch (jsonErr) {
                errorMessage = String(e);
            }
        }
        
        console.error("[Feed] DB Load Error:", errorMessage);
    } finally {
        setLoading(false);
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [type, refreshTrigger]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      
      if (isAtBottom && !loading && type !== 'custom') {
          // Pagination can be implemented here
      }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || videos.length === 0 || isPending) return;

    if (observerRef.current) {
        observerRef.current.disconnect();
    }

    const options = {
      root: container,
      threshold: 0.6, 
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target) {
          const indexStr = entry.target.getAttribute('data-index');
          if (indexStr) {
            const idx = parseInt(indexStr, 10);
            setActiveIndex(idx);
          }
        }
      });
    }, options);

    const children = Array.from(container.children);
    children.forEach((child) => {
        if (child instanceof Element && observerRef.current) {
            observerRef.current.observe(child);
        }
    });

    return () => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
    };
  }, [videos.length, loading, isPending]); 

  useEffect(() => {
    if (isFirstRun.current && containerRef.current && videos.length > 0 && initialIndex > 0) {
        setTimeout(() => {
            if (!containerRef.current) return;
            const el = containerRef.current.children[initialIndex] as HTMLElement;
            if (el) {
                el.scrollIntoView({ behavior: 'auto' });
                setActiveIndex(initialIndex);
            }
        }, 50);
        isFirstRun.current = false;
    }
  }, [videos, initialIndex]);

  return (
    <div className="relative w-full h-full bg-black">
        {onBack && (
            <div className="absolute top-0 left-0 w-full z-50 pt-safe px-4 py-4 pointer-events-none">
                <button 
                  onClick={onBack} 
                  className="pointer-events-auto w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>
        )}

        {isRefreshing && (
            <div className="absolute top-20 left-0 w-full flex justify-center z-[100] animate-bounce">
                <div className="bg-brand-pink/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl border border-white/20">
                    <RefreshCw size={12} className="animate-spin" /> Refreshing Feed...
                </div>
            </div>
        )}

        <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full h-full overflow-y-scroll snap-y-mandatory no-scrollbar bg-transparent"
            style={{ 
              height: "100vh",
              overflowY: "scroll",
              scrollSnapType: "y mandatory" 
            }}
        >
        {videos.length === 0 && !loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-500 bg-brand-indigo">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <VideoIcon size={40} className="opacity-50" />
                </div>
                <div className="text-center px-8">
                    <h3 className="text-white font-black text-lg uppercase tracking-widest mb-1">No vibes yet</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Be the first to share a moment!</p>
                </div>
            </div>
        ) : (
            videos.map((video, index) => {
                const preloadRange = isDataSaver ? 1 : 2;
                const isVisible = Math.abs(index - activeIndex) <= preloadRange;
                const shouldLoad = Math.abs(index - activeIndex) <= (isDataSaver ? 0 : 1);

                return (
                <div 
                    key={`${video.id}-${index}`} 
                    data-index={index}
                    className="w-full h-full snap-start snap-always relative"
                    style={{ scrollSnapAlign: "start" }}
                >
                    {isVisible ? (
                        <VideoCard 
                            video={video} 
                            isActive={index === activeIndex} 
                            shouldLoad={shouldLoad} 
                            isFeedVisible={isFeedVisible} 
                            onOpenComments={onOpenComments}
                            onOpenShare={onOpenShare}
                            onRequireAuth={onRequireAuth}
                            isLoggedIn={isLoggedIn}
                            onNavigate={onNavigate}
                            isLiked={likedVideoIds?.has(video.id)}
                            onToggleLike={onToggleLike}
                            addedCommentCount={addedCommentCounts ? (addedCommentCounts[video.id] || 0) : 0}
                            isFollowed={followedUserIds?.has(video.user.id)}
                            onToggleFollow={onToggleFollow}
                            onOpenLocation={onOpenLocation}
                            isMuted={isMuted}
                            onToggleMute={onToggleMute}
                        />
                    ) : (
                        <div className="w-full h-full bg-black"></div>
                    )}
                </div>
                );
            })
        )}
        
        {loading && !isRefreshing && (
            <div className="w-full h-full snap-start relative flex items-center justify-center bg-black" style={{ scrollSnapAlign: "start" }}>
                <Loader size={40} className="animate-spin text-brand-pink" />
            </div>
        )}
        </div>
    </div>
  );
};