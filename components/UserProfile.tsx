
import React, { useState, useEffect } from 'react';
import { User, Video, PageRoute } from '../types';
import { ChevronLeft, MoreHorizontal, ChevronDown, Play, Lock, Loader } from 'lucide-react';
import { formatNumber } from '../constants';
import { backend } from '../services/backend';
import { supabase } from '../services/supabaseClient';

interface UserProfileProps {
  user: User;
  onBack: () => void;
  onVideoClick: (video: Video, index: number, allVideos: Video[]) => void;
  isFollowed?: boolean;
  onToggleFollow?: (userId: string) => void;
  onRequireAuth?: (cb: () => void) => void;
  onNavigate?: (route: PageRoute) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
    user, 
    onBack, 
    onVideoClick,
    isFollowed = false,
    onToggleFollow,
    onRequireAuth,
    onNavigate
}) => {
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadUserVideos = async (userId: string) => {
    setIsLoading(true);
    // Use the robust backend method instead of raw supabase calls
    const videos = await backend.content.getMyVideos(userId);
    setUserVideos(videos);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUserVideos(user.id);
  }, [user.id]);

  useEffect(() => {
    // Record Profile View
    const recordView = async () => {
        const viewer = await backend.auth.getCurrentUserAsync();
        if (viewer && viewer.id !== user.id) {
            backend.user.recordProfileView(viewer.id, user.id);
        }
    };
    recordView();
  }, [user.id]);

  const handleFollow = () => {
      if (onRequireAuth && onToggleFollow) {
          onRequireAuth(() => onToggleFollow(user.id));
      }
  };

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-right overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center p-4 sticky top-0 z-20 bg-brand-indigo/95 backdrop-blur-md pt-safe">
         <button onClick={onBack}><ChevronLeft size={28} className="text-white" /></button>
         <div className="font-bold text-white flex items-center gap-1">
             {user.displayName}
             {user.coins > 1000 && <div className="bg-blue-500 rounded-full w-3 h-3 flex items-center justify-center text-[8px]">✓</div>}
         </div>
         <button><MoreHorizontal size={24} className="text-white" /></button>
      </div>

      <div className="flex flex-col items-center pb-24">
         {/* Avatar Area */}
         <div className="relative mb-3">
             <div className="w-24 h-24 rounded-full border-2 border-white/10 p-1">
                 <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
             </div>
             {user.isLive && (
                 <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-brand-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-md border-2 border-brand-indigo animate-pulse">
                     LIVE
                 </div>
             )}
         </div>

         <h2 className="text-sm font-bold text-white mb-1">@{user.username}</h2>
         
         <div className="flex items-center gap-6 mt-4 mb-6 text-white">
             <button 
                onClick={() => onNavigate?.({ name: 'followers-list', user, type: 'following' })}
                className="flex flex-col items-center group"
             >
                 <span className="font-bold text-lg group-hover:text-brand-pink transition-colors">{formatNumber(user.following)}</span>
                 <span className="text-xs text-gray-400">Following</span>
             </button>
             <button 
                onClick={() => onNavigate?.({ name: 'followers-list', user, type: 'followers' })}
                className="flex flex-col items-center group"
             >
                 <span className="font-bold text-lg group-hover:text-brand-gold transition-colors">{formatNumber(user.followers)}</span>
                 <span className="text-xs text-gray-400">Followers</span>
             </button>
             <div className="flex flex-col items-center">
                 <span className="font-bold text-lg">{formatNumber(user.likes)}</span>
                 <span className="text-xs text-gray-400">Likes</span>
             </div>
         </div>

         {/* Actions */}
         <div className="flex gap-2 w-full px-12 mb-6">
             {isFollowed ? (
                 <div className="flex gap-2 w-full">
                     <button 
                        onClick={handleFollow}
                        className="flex-1 py-2.5 bg-white/10 border border-white/10 rounded-sm text-sm font-bold text-white"
                     >
                        Message
                     </button>
                     <button className="px-3 bg-white/10 border border-white/10 rounded-sm text-white">
                        <ChevronDown size={16} />
                     </button>
                 </div>
             ) : (
                 <button 
                    onClick={handleFollow}
                    className="flex-1 py-3 bg-brand-gold text-black rounded-sm text-sm font-bold shadow-lg shadow-brand-gold/20"
                 >
                    Follow
                 </button>
             )}
         </div>

         <p className="px-8 text-center text-sm text-white/90 mb-6 leading-snug">
            {user.bio || `Creator on Happy Africa. Follow me for daily vibes! 🌍✨`}
         </p>

         {/* Tabs */}
         <div className="w-full flex border-b border-white/10 mb-0.5 sticky top-[60px] bg-brand-indigo z-10">
             <div className="flex-1 flex justify-center py-3 border-b-2 border-white text-white cursor-pointer">
                 <span className="text-2xl">⚡</span>
             </div>
             <div className="flex-1 flex justify-center py-3 text-gray-500 cursor-pointer">
                 <span className="text-2xl">❤️</span>
             </div>
             <div className="flex-1 flex justify-center py-3 text-gray-500 cursor-pointer">
                 <Lock size={20} />
             </div>
         </div>

         {/* Grid */}
         <div className="w-full grid grid-cols-3 gap-[1px] min-h-[200px]">
             {isLoading ? (
                 <div className="col-span-3 flex justify-center py-10">
                     <Loader className="animate-spin text-brand-pink" />
                 </div>
             ) : userVideos.length === 0 ? (
                 <div className="col-span-3 text-center py-10 text-gray-500 text-sm">
                     No videos yet.
                 </div>
             ) : (
                 userVideos.map((video, idx) => (
                     <div 
                        key={idx} 
                        onClick={() => onVideoClick(video, idx, userVideos)}
                        className="aspect-[3/4] bg-brand-dark relative cursor-pointer"
                     >
                         <video src={video.url} className="w-full h-full object-cover opacity-80" muted />
                         <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] text-white font-bold drop-shadow-md">
                             <Play size={10} fill="white" /> {formatNumber(video.likes)}
                         </div>
                         {video.type === 'slideshow' && (
                             <div className="absolute top-1 right-1 bg-black/50 p-1 rounded">
                                 <div className="w-2 h-2 bg-white rounded-full"></div>
                             </div>
                         )}
                     </div>
                 ))
             )}
         </div>
      </div>
    </div>
  );
};
