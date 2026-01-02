import React, { useState, useRef, useEffect } from 'react';
import { LiveViewer } from './LiveViewer';
import { LiveStream, User } from '../types';
import { MOCK_USERS } from '../constants';
import { backend } from '../services/backend';
import { Loader } from 'lucide-react';

interface LiveFeedProps {
  currentUser: User;
  onClose: () => void;
  onRequireAuth: (cb: () => void) => void;
  isLoggedIn: boolean;
  followedUserIds?: Set<string>;
  onToggleFollow?: (userId: string) => void;
}

// All mock live streams removed
const MOCK_LIVES: LiveStream[] = [];

export const LiveFeed: React.FC<LiveFeedProps> = ({ currentUser, onClose, onRequireAuth, isLoggedIn, followedUserIds, onToggleFollow }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStreams = async () => {
        setIsLoading(true);
        try {
            const active = await backend.live.getActiveStreams();
            setStreams(active);
        } catch (e) {
            setStreams([]);
        } finally {
            setIsLoading(false);
        }
    };
    fetchStreams();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || streams.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const indexStr = entry.target.getAttribute('data-index');
          if (indexStr) {
            setActiveIndex(parseInt(indexStr, 10));
          }
        }
      });
    }, { threshold: 0.6 });

    Array.from(container.children).forEach((child) => {
        observer.observe(child as Element);
    });

    return () => observer.disconnect();
  }, [streams]);

  return (
    <div 
       ref={containerRef}
       className="fixed inset-0 w-full h-full bg-black overflow-y-scroll snap-y-mandatory no-scrollbar z-[50]"
    >
       {isLoading ? (
           <div className="h-full flex items-center justify-center">
               <Loader size={32} className="animate-spin text-white" />
           </div>
       ) : streams.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
               <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <Wifi size={40} className="opacity-50" />
               </div>
               <p className="font-bold uppercase tracking-widest text-xs">No active LIVE streams</p>
               <button onClick={onClose} className="mt-4 text-brand-pink font-bold text-sm">Go Back</button>
           </div>
       ) : (
           streams.map((stream, index) => (
               <div 
                  key={stream.id} 
                  data-index={index}
                  className="w-full h-full snap-start snap-always"
               >
                   <LiveViewer 
                      stream={stream}
                      currentUser={currentUser}
                      onClose={onClose}
                      onRequireAuth={onRequireAuth}
                      isLoggedIn={isLoggedIn}
                      isActive={index === activeIndex}
                      isFollowed={followedUserIds?.has(stream.host.id)}
                      onToggleFollow={onToggleFollow}
                   />
               </div>
           ))
       )}
    </div>
  );
};

// Internal Wifi import helper for the empty state
import { Wifi } from 'lucide-react';