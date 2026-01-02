import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, ChevronRight } from 'lucide-react';
import { Video } from '../types';

interface VideoTrimmerProps {
  sourceVideo: Video;
  onCancel: () => void;
  onNext: (trimData: { startTime: number; duration: number }) => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ sourceVideo, onCancel, onNext }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(5); // Default 5s stitch
  const [maxDuration, setMaxDuration] = useState(10);
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
        const current = videoRef.current.currentTime;
        const end = startTime + duration;
        
        // Loop within selection
        if (current >= end) {
            videoRef.current.currentTime = startTime;
            if (!isPlaying) setIsPlaying(false);
        }
        
        const p = ((current - startTime) / duration) * 100;
        setProgress(Math.max(0, Math.min(100, p)));
    }
  };

  const togglePlay = () => {
      if (videoRef.current) {
          if (isPlaying) {
              videoRef.current.pause();
          } else {
              videoRef.current.play();
          }
          setIsPlaying(!isPlaying);
      }
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
      // Mock drag logic for MVP - Simplification: Clicking on bar jumps to that spot
      const container = e.currentTarget.getBoundingClientRect();
      let clientX;
      if ('touches' in e) clientX = e.touches[0].clientX;
      else clientX = (e as React.MouseEvent).clientX;
      
      const pct = (clientX - container.left) / container.width;
      const videoDur = videoRef.current?.duration || 10;
      const newStart = Math.max(0, Math.min(videoDur - duration, pct * videoDur));
      
      setStartTime(newStart);
      if (videoRef.current) {
          videoRef.current.currentTime = newStart;
      }
  };

  return (
    <div className="absolute inset-0 bg-brand-indigo z-[60] flex flex-col animate-slide-up">
       {/* Header */}
       <div className="flex justify-between items-center p-4 pt-safe">
           <button onClick={onCancel}><X size={28} className="text-white" /></button>
           <span className="font-bold text-white text-sm">Trim to Stitch</span>
           <button 
             onClick={() => onNext({ startTime, duration })}
             className="bg-brand-pink text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
           >
               Next <ChevronRight size={14} />
           </button>
       </div>

       {/* Preview */}
       <div className="flex-1 flex items-center justify-center bg-black relative" onClick={togglePlay}>
           <video 
              ref={videoRef}
              src={sourceVideo.url}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setMaxDuration(videoRef.current?.duration || 10)}
           />
           {!isPlaying && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                   <Play size={48} className="text-white fill-white" />
               </div>
           )}
       </div>

       {/* Controls */}
       <div className="h-48 bg-brand-dark pb-safe flex flex-col px-4 pt-6">
           <div className="flex justify-between text-xs text-gray-400 mb-2 font-mono">
               <span>{(startTime).toFixed(1)}s</span>
               <span>{(startTime + duration).toFixed(1)}s</span>
           </div>

           {/* Timeline Slider */}
           <div 
             className="relative h-16 bg-gray-800 rounded-lg mb-8 overflow-hidden cursor-pointer"
             onClick={handleDragStart}
           >
               {/* Filmstrip Background Mock */}
               <div className="absolute inset-0 flex opacity-50">
                   {[...Array(10)].map((_, i) => (
                       <div key={i} className="flex-1 bg-gray-600 border-r border-gray-500"></div>
                   ))}
               </div>

               {/* Selection Box */}
               <div 
                  className="absolute top-0 bottom-0 border-4 border-brand-pink bg-brand-pink/20 rounded-md z-10"
                  style={{
                      left: `${(startTime / maxDuration) * 100}%`,
                      width: `${(duration / maxDuration) * 100}%`
                  }}
               >
                   {/* Playhead */}
                   <div 
                     className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                     style={{ left: `${progress}%` }}
                   ></div>
               </div>
           </div>

           <p className="text-center text-xs text-gray-500">
               Select up to 5 seconds to stitch with your video.
           </p>
       </div>
    </div>
  );
};