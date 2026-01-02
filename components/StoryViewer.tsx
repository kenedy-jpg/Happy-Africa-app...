
import React, { useState, useEffect } from 'react';
import { X, Heart, Send, MoreHorizontal } from 'lucide-react';
import { User } from '../types';

interface StoryViewerProps {
  user: User;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ user, onClose }) => {
  const [progress, setProgress] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const stories = [
      "https://picsum.photos/400/800?random=101",
      "https://picsum.photos/400/800?random=102",
      "https://picsum.photos/400/800?random=103"
  ]; // Mock stories

  useEffect(() => {
      const interval = setInterval(() => {
          setProgress(prev => {
              if (prev >= 100) {
                  if (storyIndex < stories.length - 1) {
                      setStoryIndex(s => s + 1);
                      return 0;
                  } else {
                      onClose();
                      return 100;
                  }
              }
              return prev + 1; // 100 ticks = 5 seconds roughly if 50ms interval
          });
      }, 50);
      return () => clearInterval(interval);
  }, [storyIndex]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 w-full pt-safe px-2 flex gap-1 z-20 mt-2">
            {stories.map((_, i) => (
                <div key={i} className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-100 ease-linear"
                        style={{ 
                            width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' 
                        }}
                    ></div>
                </div>
            ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 w-full px-4 pt-safe flex justify-between items-center z-20">
            <div className="flex items-center gap-2">
                <img src={user.avatarUrl} className="w-8 h-8 rounded-full border border-white" />
                <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{user.username}</span>
                <span className="text-gray-300 text-xs shadow-black drop-shadow-md">2h</span>
            </div>
            <div className="flex gap-4">
                <MoreHorizontal className="text-white drop-shadow-md" />
                <button onClick={onClose}><X className="text-white drop-shadow-md" /></button>
            </div>
        </div>

        {/* Story Content */}
        <div className="flex-1 bg-gray-900 relative">
            <img src={stories[storyIndex]} className="w-full h-full object-cover" />
            {/* Tap areas */}
            <div className="absolute inset-y-0 left-0 w-1/3" onClick={() => {
                if(storyIndex > 0) { setStoryIndex(s => s - 1); setProgress(0); }
            }}></div>
            <div className="absolute inset-y-0 right-0 w-1/3" onClick={() => {
                if(storyIndex < stories.length - 1) { setStoryIndex(s => s + 1); setProgress(0); } else { onClose(); }
            }}></div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 w-full p-4 pb-safe z-20 flex items-center gap-3">
            <div className="flex-1 bg-black/40 border border-white/20 rounded-full h-10 px-4 flex items-center">
                <input placeholder="Send message" className="bg-transparent text-white text-sm outline-none w-full placeholder-gray-300" />
            </div>
            <Heart className="text-white drop-shadow-md" />
            <Send className="text-white drop-shadow-md" />
        </div>
    </div>
  );
};
