import React, { useEffect, useState, useRef } from 'react';
import { X, Search, Play, Pause, Loader, Music as MusicIcon, Volume2 } from 'lucide-react';
import { getTrendingMusic } from '../services/geminiService';
import { MusicTrack } from '../types';

interface MusicPickerProps {
  onSelect: (track: MusicTrack) => void;
  onClose: () => void;
}

export const MusicPicker: React.FC<MusicPickerProps> = ({ onSelect, onClose }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchMusic = async () => {
      setLoading(true);
      const trending = await getTrendingMusic();
      
      // Enhance with Cover Art based on Artist Seed
      const enhancedTracks = trending.map((t, idx) => ({
        ...t,
        id: t.id || `track-${idx}`,
        // Use deterministic random image based on artist name length/char codes
        cover: `https://picsum.photos/seed/${t.artist.replace(/\s/g, '')}/100/100`
      }));
      
      setTracks(enhancedTracks);
      setLoading(false);
    };

    fetchMusic();
    
    // Cleanup audio on unmount
    return () => {
       if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
       }
    };
  }, []);

  const handlePlayPreview = (track: MusicTrack, e: React.MouseEvent) => {
     e.stopPropagation();
     
     if (playingTrackId === track.id) {
        // Pause
        audioRef.current?.pause();
        setPlayingTrackId(null);
     } else {
        // Play new
        if (audioRef.current) {
           audioRef.current.pause();
        }
        
        if (track.audioUrl) {
           audioRef.current = new Audio(track.audioUrl);
           audioRef.current.volume = 0.5;
           audioRef.current.play().catch(e => console.error("Audio playback error", e));
           audioRef.current.onended = () => setPlayingTrackId(null);
           setPlayingTrackId(track.id);
        }
     }
  };

  const handleSelect = (track: MusicTrack) => {
     // Stop preview before selecting
     if (audioRef.current) {
        audioRef.current.pause();
     }
     onSelect(track);
  };

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute inset-0 bg-brand-indigo z-[60] flex flex-col animate-slide-up">
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <button onClick={onClose}><X className="text-white" /></button>
        <h2 className="text-white font-bold">Add Sound</h2>
        <div className="w-6"></div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-brand-dark rounded-lg flex items-center px-3 py-2 gap-2 mb-6 border border-white/5 sticky top-0 z-10">
           <Search size={18} className="text-gray-400" />
           <input 
             className="bg-transparent outline-none text-white text-sm w-full placeholder-gray-500" 
             placeholder="Search songs, artists..." 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>

        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
           <MusicIcon size={16} className="text-brand-pink" /> 
           Trending Now 
           <span className="text-[10px] text-gray-500 font-normal ml-2">Powered by Google AI</span>
        </h3>
        
        {loading ? (
           <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-500">
              <Loader size={30} className="animate-spin text-brand-pink" />
              <p className="text-xs">Curating latest hits...</p>
           </div>
        ) : (
           <div className="flex flex-col gap-4">
              {filteredTracks.map(track => (
                <div key={track.id} className="flex items-center justify-between group active:scale-[0.98] transition-transform" onClick={() => handleSelect(track)}>
                   <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded bg-brand-dark overflow-hidden group-hover:ring-2 ring-brand-pink transition-all border border-white/10 shrink-0 cursor-pointer" onClick={(e) => handlePlayPreview(track, e)}>
                         <img src={track.cover} className="w-full h-full object-cover" alt={track.title} />
                         <div className={`absolute inset-0 bg-black/30 flex items-center justify-center ${playingTrackId === track.id ? 'opacity-100 bg-black/50' : ''}`}>
                            {playingTrackId === track.id ? (
                               <div className="flex items-center justify-center w-full h-full">
                                  <div className="flex gap-0.5 h-3 items-end">
                                    <div className="w-1 bg-brand-pink animate-pulse h-full"></div>
                                    <div className="w-1 bg-brand-pink animate-pulse h-2"></div>
                                    <div className="w-1 bg-brand-pink animate-pulse h-3"></div>
                                  </div>
                               </div>
                            ) : (
                               <Play size={16} className="text-white fill-white opacity-80" />
                            )}
                         </div>
                      </div>
                      <div>
                         <p className={`text-sm font-bold line-clamp-1 ${playingTrackId === track.id ? 'text-brand-pink' : 'text-white'}`}>{track.title}</p>
                         <p className="text-gray-400 text-xs flex items-center gap-1">
                            {track.artist}
                            {track.genre && <span className="w-1 h-1 bg-gray-600 rounded-full"></span>}
                            <span className="text-brand-gold">{track.genre}</span>
                         </p>
                         <p className="text-gray-500 text-[10px] mt-0.5">{track.duration}</p>
                      </div>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleSelect(track); }}
                     className="bg-brand-pink text-white px-3 py-1.5 rounded text-xs font-bold hover:brightness-110 shadow-lg shadow-brand-pink/20"
                   >
                      Use
                   </button>
                </div>
              ))}
              
              {filteredTracks.length === 0 && (
                 <div className="text-center text-gray-500 text-sm py-4">No songs found.</div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};