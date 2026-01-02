
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Share2, Bookmark, Hash, Play, Video as VideoIcon, Loader } from 'lucide-react';
import { Video } from '../types';
import { formatNumber } from '../constants';
import { backend } from '../services/backend';

interface HashtagDetailProps {
  id: string; // The hashtag text (e.g., #dance)
  allVideos: Video[];
  onBack: () => void;
  onVideoClick: (video: Video, index: number, allVideos: Video[]) => void;
  onJoinHashtag?: (tag: string) => void;
}

export const HashtagDetail: React.FC<HashtagDetailProps> = ({ id, onBack, onVideoClick, onJoinHashtag }) => {
  const tagName = id.replace('#', '');
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchVideos = async () => {
          setIsLoading(true);
          try {
              // Fix: Method added to backend.ts, remove as any cast
              const results = await backend.content.getVideosByHashtag(tagName);
              setVideos(results);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchVideos();
  }, [tagName]);

  const viewCount = videos.reduce((acc, v) => acc + v.likes + v.shares, 0) * 100;

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-right overflow-y-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 sticky top-0 bg-brand-indigo/95 backdrop-blur-md z-10 pt-safe">
        <button onClick={onBack}><ChevronLeft size={28} className="text-white" /></button>
        <div className="font-bold text-sm text-white">Trending Hashtag</div>
        <button><Share2 size={24} className="text-white" /></button>
      </div>

      {/* Info Card */}
      <div className="flex flex-col items-center pt-2 pb-8">
        <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center mb-4 relative overflow-hidden border border-white/10">
            <span className="text-4xl font-bold text-brand-pink relative z-10">#</span>
            <div className="absolute inset-0 bg-brand-pink opacity-10"></div>
        </div>
        
        <h1 className="text-xl font-bold text-white mb-1">{tagName}</h1>
        <p className="text-gray-400 text-xs font-medium mb-4">{formatNumber(viewCount)} Views</p>
        
        <button className="flex items-center gap-2 px-8 py-2 border border-white/20 rounded-sm text-xs font-bold text-white hover:bg-white/5">
           <Bookmark size={14} className="text-brand-pink fill-brand-pink" /> 
           Add to Favorites
        </button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-3 gap-[1px] pb-24 min-h-[200px]">
         {isLoading ? (
             <div className="col-span-3 flex justify-center py-10">
                 <Loader className="animate-spin text-brand-pink" />
             </div>
         ) : videos.length === 0 ? (
             <div className="col-span-3 text-center py-10 text-gray-500 text-sm">
                 No videos yet.
             </div>
         ) : (
             videos.map((video, i) => (
                 <div 
                    key={i} 
                    className="aspect-[3/4] bg-brand-dark relative group cursor-pointer"
                    onClick={() => onVideoClick(video, i, videos)}
                 >
                     <video src={video.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                     <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] text-white font-bold drop-shadow-md">
                         <Play size={10} fill="white" /> {formatNumber(video.likes)}
                     </div>
                 </div>
             ))
         )}
      </div>

      {/* Floating CTA - Join Hashtag */}
      <div className="fixed bottom-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pb-safe pointer-events-none z-20">
         <button 
           onClick={() => onJoinHashtag && onJoinHashtag(id)}
           className="pointer-events-auto w-full bg-brand-pink text-white font-bold py-3.5 rounded-sm shadow-lg shadow-brand-pink/30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
         >
             <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
                 <VideoIcon size={14} className="text-white" />
             </div>
             Join this Hashtag
         </button>
      </div>
    </div>
  );
};
