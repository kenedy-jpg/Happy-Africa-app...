
import React from 'react';
import { Search, Radio, LogIn, UserPlus } from 'lucide-react';
import { FeedType } from '../types';

interface HomeHeaderProps {
  activeFeed: FeedType;
  onFeedChange: (type: FeedType) => void;
  onSearchClick: () => void;
  onLiveClick: () => void;
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ 
  activeFeed, 
  onFeedChange, 
  onSearchClick, 
  onLiveClick,
  isLoggedIn,
  onSignIn,
  onSignUp
}) => {
  const tabs: { id: FeedType; label: string; colorClass: string; shadowClass: string }[] = [
    { id: 'following', label: 'Following', colorClass: 'text-brand-gold', shadowClass: 'shadow-[0_0_15px_rgba(255,215,0,0.8)]' },
    { id: 'friends', label: 'Friends', colorClass: 'text-brand-gold', shadowClass: 'shadow-[0_0_15px_rgba(255,215,0,0.8)]' },
    { id: 'foryou', label: 'For You', colorClass: 'text-brand-pink', shadowClass: 'shadow-[0_0_15px_rgba(255,79,154,0.8)]' },
    { id: 'nearby', label: 'Nearby', colorClass: 'text-brand-pink', shadowClass: 'shadow-[0_0_15px_rgba(255,79,154,0.8)]' },
  ];

  return (
    <div className="absolute top-0 left-0 w-full z-[45] pt-safe px-3 flex flex-col pointer-events-none">
      <div className="flex items-center justify-between py-1">
        <button onClick={onLiveClick} className="pointer-events-auto w-8 h-8 flex items-center justify-center text-brand-pink active:scale-90 transition-transform">
          <Radio size={18} />
        </button>

        <div className="flex items-center gap-3 pointer-events-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => onFeedChange(tab.id)} className="relative py-2 flex flex-col items-center group">
              <span className={`text-[11px] font-black transition-all duration-200 drop-shadow-md ${activeFeed === tab.id ? 'text-brand-pink scale-110' : 'text-white/60 hover:text-white'}`}>
                {tab.label}
              </span>
              {activeFeed === tab.id && (
                <div className="absolute bottom-0 w-5 h-0.5 rounded-full bg-brand-pink shadow-[0_0_8px_rgba(255,79,154,0.8)] transition-all duration-300" />
              )}
            </button>
          ))}
        </div>

        <button onClick={onSearchClick} className="pointer-events-auto w-8 h-8 flex items-center justify-center text-brand-pink active:scale-90 transition-transform">
          <Search size={18} strokeWidth={3} />
        </button>
      </div>

      {!isLoggedIn && (
        <div className="flex justify-center gap-2 py-1 pointer-events-auto">
           <button onClick={onSignIn} className="bg-brand-pink text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg shadow-brand-pink/20 active:scale-95">
              <LogIn size={12} /> SIGN IN
           </button>
           <button onClick={onSignUp} className="bg-brand-pink text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg shadow-brand-pink/20 active:scale-95">
              <UserPlus size={12} /> JOIN NOW
           </button>
        </div>
      )}
    </div>
  );
};
