
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause, Share2, Bookmark, Music, Video as VideoIcon, Loader } from 'lucide-react';
import { Video } from '../types';
import { formatNumber } from '../constants';
import { backend } from '../services/backend';

interface SoundDetailProps {
  id: string;
  title: string;
  artist?: string;
  cover?: string;
  audioUrl?: string; 
  allVideos: Video[]; // Legacy prop kept for type safety, but we'll fetch fresh data
  onBack: () => void;
  onUseSound: (track: { title: string; artist: string; id: string; audioUrl?: string }) => void;
  onVideoClick: (video: Video, index: number, allVideos: Video[]) => void;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

export const SoundDetail: React.FC<SoundDetailProps> = ({ id, title, artist, cover, audioUrl, onBack, onUseSound, onVideoClick, isSaved, onToggleSave }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      const fetchVideos = async () => {
          setIsLoading(true);
          try {
              // Fix: Method added to backend.ts, remove as any cast
              const results = await backend.content.getVideosBySound(title); // Search by title/id
              setVideos(results);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchVideos();

      // Cleanup audio
      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, [title]);

  const togglePlay = () => {
      if (!audioUrl) return;

      if (!audioRef.current) {
          audioRef.current = new Audio(audioUrl);
          audioRef.current.loop = true;
      }

      if (isPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current.play().catch(e => console.error("Playback error", e));
      }
      setIsPlaying(!isPlaying);
  };

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-right overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center p-4 sticky top-0 bg-brand-indigo/95 backdrop-blur-md z-10 pt-safe">
        <button onClick={onBack}><ChevronLeft size={28} className="text-white" /></button>
        <div className="font-bold text-sm text-white opacity-0 animate-fade-in" style={{animationDelay: '0.2s', opacity: 1}}>Sound</div>
        <button><Share2 size={24} className="text-white" /></button>
      </div>

      {/* Info Card */}
      <div className="px-4 pb-6 flex gap-4 items-start border-b border-white/5 mx-4 mb-4">
        <div 
            className="w-28 h-28 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shrink-0 border border-white/10 relative overflow-hidden group shadow-lg cursor-pointer"
            onClick={togglePlay}
        >
            {cover ? (
                <img src={cover} className={`w-full h-full object-cover ${isPlaying ? 'scale-110' : 'scale-100'} transition-transform duration-700`} />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#222]">
                    <Music size={40} className="text-gray-500" />
                </div>
            )}
            <div className={`absolute inset-0 bg-black/20 flex items-center justify-center ${isPlaying ? 'bg-black/40' : ''}`}>
                <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                    {isPlaying ? (
                        <Pause size={18} fill="white" className="text-white" />
                    ) : (
                        <Play size={18} fill="white" className="text-white ml-0.5" />
                    )}
                </div>
            </div>
            {isPlaying && (
                <div className="absolute bottom-2 left-0 w-full flex justify-center gap-1">
                    <div className="w-1 h-3 bg-brand-pink animate-pulse"></div>
                    <div className="w-1 h-5 bg-brand-pink animate-pulse delay-75"></div>
                    <div className="w-1 h-3 bg-brand-pink animate-pulse delay-150"></div>
                </div>
            )}
        </div>
        <div className="flex-1 py-1">
            <h1 className="text-xl font-bold text-white mb-1 leading-tight line-clamp-2">{title}</h1>
            <p className="text-gray-300 text-sm mb-4">{artist || 'Original Sound'}</p>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => onToggleSave && onToggleSave(id)}
                    className={`flex items-center justify-center gap-2 px-4 py-1.5 border rounded-sm font-semibold text-xs transition-colors ${
                        isSaved 
                        ? 'bg-white text-black border-white' 
                        : 'border-white/20 text-white hover:bg-white/5'
                    }`}
                >
                    <Bookmark size={14} className={isSaved ? "fill-black" : ""} /> 
                    {isSaved ? 'Saved' : 'Add to Favorites'}
                </button>
            </div>
        </div>
      </div>
      
      <div className="px-4 pb-2">
          <h3 className="font-bold text-sm text-white mb-2">{videos.length} Videos</h3>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-3 gap-[1px] pb-24 min-h-[200px]">
         {isLoading ? (
             <div className="col-span-3 flex justify-center py-10">
                 <Loader className="animate-spin text-brand-pink" />
             </div>
         ) : videos.length === 0 ? (
             <div className="col-span-3 text-center py-10 text-gray-500 text-sm">
                 No videos using this sound yet.
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

      {/* Floating CTA */}
      <div className="fixed bottom-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pb-safe pointer-events-none z-20">
         <button 
           onClick={() => onUseSound({ title, artist: artist || 'Original', id, audioUrl })}
           className="pointer-events-auto w-full bg-brand-pink text-white font-bold py-3.5 rounded-sm shadow-lg shadow-brand-pink/30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
         >
             <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
                 <VideoIcon size={14} className="text-white" />
             </div>
             Use this sound
         </button>
      </div>
    </div>
  );
};
