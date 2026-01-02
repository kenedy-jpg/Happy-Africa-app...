
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
    <div className="absolute top-0 left-0 w-full z-[45] pt-safe px-4 flex flex-col pointer-events-none">
      <div className="flex items-center justify-between py-2">
        <button onClick={onLiveClick} className="pointer-events-auto w-10 h-10 flex items-center justify-center text-white active:scale-90 transition-transform">
          <Radio size={24} />
        </button>

        <div className="flex items-center gap-5 pointer-events-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => onFeedChange(tab.id)} className="relative py-4 flex flex-col items-center group">
              <span className={`text-[15px] font-black transition-all duration-200 drop-shadow-md ${activeFeed === tab.id ? `${tab.colorClass} scale-110` : 'text-white/60 hover:text-white'}`}>
                {tab.label}
              </span>
              {activeFeed === tab.id && (
                <div className={`absolute bottom-2 w-7 h-1 rounded-full ${tab.id === 'foryou' || tab.id === 'nearby' ? 'bg-brand-pink' : 'bg-brand-gold'} ${tab.shadowClass} transition-all duration-300`} />
              )}
            </button>
          ))}
        </div>

        <button onClick={onSearchClick} className="pointer-events-auto w-10 h-10 flex items-center justify-center text-brand-gold active:scale-90 transition-transform">
          <Search size={24} strokeWidth={3} />
        </button>
      </div>

      {!isLoggedIn && (
        <div className="flex justify-center gap-3 py-2 pointer-events-auto">
           <button onClick={onSignIn} className="bg-brand-pink text-white px-5 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-pink/20 active:scale-95">
              <LogIn size={14} /> SIGN IN
           </button>
           <button onClick={onSignUp} className="bg-brand-pink text-white px-5 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-pink/20 active:scale-95">
              <UserPlus size={14} /> JOIN NOW
           </button>
        </div>
      )}
    </div>
  );
};
