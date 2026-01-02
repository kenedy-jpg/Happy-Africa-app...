import React, { useRef, useState, useEffect, memo } from 'react';
import { Video, Clip } from '../types';
import { Heart, MessageCircle, Share2, Music, Plus, MapPin, Volume2, VolumeX, Clock, Play, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { formatNumber } from '../constants';
import Hls from 'hls.js';
import { OptimizedImage } from './OptimizedImage';

interface VideoCardProps {
  video: Video;
  isActive: boolean; 
  shouldLoad: boolean; 
  isFeedVisible?: boolean; 
  onOpenComments: (videoId: string, highlightCommentId?: string) => void;
  onOpenShare: (video: Video) => void;
  onRequireAuth: (cb: () => void) => void;
  isLoggedIn: boolean;
  onNavigate?: (route: any) => void;
  isLiked?: boolean;
  onToggleLike?: (videoId: string) => void;
  addedCommentCount?: number; 
  isFollowed?: boolean;
  onToggleFollow?: (userId: string) => void;
  onOpenLocation?: (locationName: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const VideoCard = memo<VideoCardProps>(({ 
  video, 
  isActive, 
  shouldLoad,
  isFeedVisible = true,
  onOpenComments, 
  onOpenShare, 
  onRequireAuth, 
  onNavigate,
  isLiked = false,
  onToggleLike,
  addedCommentCount = 0,
  isFollowed = false,
  onToggleFollow,
  onOpenLocation,
  isMuted,
  onToggleMute
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{id: number, x: number, y: number, rotation: number, scale: number}[]>([]);
  const [showMuteStatus, setShowMuteStatus] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  const isSlideshow = video.type === 'slideshow' && video.images && video.images.length > 0;
  const currentVideoSrc = video.url || "";

  useEffect(() => {
    if (!isSlideshow || !isActive || !isFeedVisible) return;
    const slideDuration = (video.duration || (video.images!.length * 3)) / video.images!.length;
    const interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % video.images!.length);
    }, slideDuration * 1000);
    return () => clearInterval(interval);
  }, [isSlideshow, isActive, isFeedVisible, video.images, video.duration]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !shouldLoad || isSlideshow || !currentVideoSrc) return;

    const shouldCurrentlyPlay = isActive && isFeedVisible && !hasError;

    if (shouldCurrentlyPlay) {
      if (currentVideoSrc.endsWith('.m3u8') && Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls();
          hls.loadSource(currentVideoSrc);
          hls.attachMedia(videoEl);
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => videoEl.play().catch(() => {}));
      }

      videoEl.playsInline = true;
      videoEl.setAttribute('playsinline', '');
      videoEl.muted = isMuted;
      videoEl.crossOrigin = "anonymous";

      videoEl.play().catch(e => {
          console.warn("Playback prevented or blocked:", e);
      });
    } else {
      videoEl.pause();
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [isActive, isFeedVisible, shouldLoad, currentVideoSrc, hasError, isSlideshow]);

  const handleContainerClick = (e: React.MouseEvent) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          handleLike(e);
          if (tapTimeoutRef.current) window.clearTimeout(tapTimeoutRef.current);
      } else {
          tapTimeoutRef.current = window.setTimeout(() => {
              onToggleMute();
              setShowMuteStatus(true);
              setTimeout(() => setShowMuteStatus(false), 1000);
          }, DOUBLE_TAP_DELAY);
      }
      lastTapRef.current = now;
  };

  const handleLike = (e: React.MouseEvent) => {
      onRequireAuth(() => {
          if (onToggleLike) onToggleLike(video.id);
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const newHeart = { id: Date.now(), x, y, rotation: Math.random() * 40 - 20, scale: Math.random() * 0.5 + 1 };
              setFloatingHearts(prev => [...prev, newHeart]);
              setTimeout(() => setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id)), 800);
          }
      });
  };

  const recoverStream = () => {
      setHasError(false);
      if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
      }
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden"
        onClick={handleContainerClick}
    >
        {isSlideshow ? (
            <div className="w-full h-full relative">
                {video.images!.map((img, idx) => (
                    <img key={idx} src={img} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${idx === currentSlideIndex ? 'opacity-100' : 'opacity-0'}`} />
                ))}
            </div>
        ) : hasError ? (
            <div className="flex flex-col items-center gap-5 text-white/80 animate-fade-in p-10 text-center">
                <div className="w-20 h-20 bg-brand-pink/20 rounded-full flex items-center justify-center">
                    <AlertCircle size={40} className="text-brand-pink" />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">Stream Blocked</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase leading-relaxed">Your network may be blocking this content provider.</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); recoverStream(); }} 
                  className="flex items-center gap-2 px-8 py-3 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all border border-white/10"
                >
                    <RefreshCw size={14} /> Retry Vibe
                </button>
            </div>
        ) : currentVideoSrc ? (
            <video 
                ref={videoRef}
                className="w-full h-full object-contain bg-black"
                loop
                playsInline
                muted={isMuted}
                crossOrigin="anonymous"
                onTimeUpdate={() => {
                    if (videoRef.current?.duration) {
                        setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                    }
                }}
                onError={() => {
                    if (isActive) setHasError(true);
                }}
                preload="auto"
            >
                <source src={currentVideoSrc} type="video/mp4" />
            </video>
        ) : (
            <div className="flex flex-col items-center gap-4 text-white/50">
                <Loader className="animate-spin text-brand-gold" size={40} />
                <span className="text-xs font-black uppercase tracking-widest">Finding the Vibe...</span>
            </div>
        )}

        {floatingHearts.map(h => (
            <div key={h.id} className="absolute pointer-events-none z-40 animate-float-up" style={{ left: h.x, top: h.y, '--rotate': `${h.rotation}deg`, '--scale': h.scale } as any}>
                <Heart size={80} className="text-brand-pink fill-brand-pink drop-shadow-xl" />
            </div>
        ))}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none"></div>

        <div className="absolute right-2 bottom-[100px] flex flex-col items-center gap-5 z-20 pointer-events-auto">
            <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden cursor-pointer active:scale-90 transition-transform" onClick={(e) => { e.stopPropagation(); onNavigate?.({ name: 'user-profile', user: video.user }); }}>
                    <OptimizedImage src={video.user.avatarUrl} alt={video.user.username} className="w-full h-full object-cover" />
                </div>
                {!isFollowed && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-brand-pink text-white w-5 h-5 rounded-full flex items-center justify-center cursor-pointer border-2 border-black" onClick={(e) => { e.stopPropagation(); onToggleFollow?.(video.user.id); }}>
                        <Plus size={14} strokeWidth={4} />
                    </div>
                )}
            </div>

            <button className="flex flex-col items-center group" onClick={(e) => { e.stopPropagation(); onRequireAuth(() => onToggleLike?.(video.id)); }}>
                <Heart size={32} className={`transition-all duration-300 ${isLiked ? 'fill-brand-pink text-brand-pink scale-125' : 'text-white group-hover:scale-110'}`} />
                <span className="text-[11px] font-bold mt-1 drop-shadow-md">{formatNumber(video.likes + (isLiked ? 1 : 0))}</span>
            </button>

            <button className="flex flex-col items-center group" onClick={(e) => { e.stopPropagation(); onOpenComments(video.id); }}>
                <MessageCircle size={32} className="text-white group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold mt-1 drop-shadow-md">{formatNumber(video.comments + addedCommentCount)}</span>
            </button>

            <button className="flex flex-col items-center group" onClick={(e) => { e.stopPropagation(); onOpenShare(video); }}>
                <Share2 size={32} className="text-white group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold mt-1 drop-shadow-md">{formatNumber(video.shares)}</span>
            </button>

            <div className="w-11 h-11 bg-gradient-to-tr from-gray-800 to-gray-600 rounded-full flex items-center justify-center border-4 border-white/20 animate-spin-slow cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate?.({ name: 'sound', id: 's1', title: video.musicTrack || 'Original Sound' }); }}>
                <Music size={18} className="text-white" />
            </div>
        </div>

        <div className="absolute left-0 bottom-0 w-full p-4 pb-[85px] z-20 pointer-events-none text-white">
            <div className="flex flex-col gap-2 max-w-[80%] pointer-events-auto">
                <h3 className="font-black text-[15px] flex items-center gap-1 drop-shadow-md cursor-pointer hover:text-brand-gold transition-colors" onClick={() => onNavigate?.({ name: 'user-profile', user: video.user })}>
                    @{video.user.username}
                </h3>
                <p className="text-[14px] leading-tight text-white/90 drop-shadow-md line-clamp-3">{video.description}</p>
                {video.location && (
                    <button onClick={() => onOpenLocation?.(video.location!)} className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/10">
                        <MapPin size={12} className="text-brand-pink" />
                        <span className="text-[11px] font-bold">{video.location}</span>
                    </button>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <Music size={14} className="text-white animate-pulse" />
                    <div className="w-40 overflow-hidden whitespace-nowrap">
                        <p className="text-[13px] font-bold animate-marquee inline-block pr-10">{video.musicTrack || 'Original Sound - Happy Africa'}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="absolute bottom-[80px] left-0 w-full h-[2px] bg-white/10 z-30">
            <div className="h-full bg-white/50 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
    </div>
  );
});