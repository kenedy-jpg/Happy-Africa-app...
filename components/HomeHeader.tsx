
import React from 'react';
import { Search, Radio, LogIn, UserPlus } from 'lucide-react';
import { FeedType } from '../types';
import { BrandLogo } from './BrandLogo';

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

      {/* Brand Logo below search button */}
      <div className="absolute top-12 right-3 pointer-events-none z-50 flex flex-col items-center gap-2">
        <BrandLogo size="sm" showText={false} />
        
        {/* African Map - Gold */}
        <svg 
          width="60" 
          height="60" 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-lg animate-pulse-slow"
        >
          <path 
            d="M100 20C95 22 92 25 90 30L88 35L85 38C82 40 80 43 78 47L75 52L72 55C70 58 68 62 67 67L65 73L62 77C60 80 58 84 57 89L55 95L53 100C52 105 51 110 51 115C51 120 52 125 54 130L57 138L60 145C62 150 65 155 69 159L73 165L78 170C82 174 87 178 93 181L100 185L107 181C113 178 118 174 122 170L127 165L131 159C135 155 138 150 140 145L143 138L146 130C148 125 149 120 149 115C149 110 148 105 147 100L145 95L143 89C142 84 140 80 138 77L135 73L133 67C132 62 130 58 128 55L125 52L122 47C120 43 118 40 115 38L112 35L110 30C108 25 105 22 100 20Z M105 45L108 48L110 52L112 57L114 62L115 67L117 73L118 79L119 85L120 92L120 100L119 108L118 115L117 122L115 128L113 134L111 139L108 144L105 148L101 151L95 153L89 151L85 148L82 144L79 139L77 134L75 128L73 122L72 115L71 108L71 100L72 92L73 85L74 79L76 73L78 67L79 62L81 57L83 52L85 48L88 45L92 43L96 42L100 42L104 43L105 45Z" 
            fill="#FFD700"
          />
          <path 
            d="M100 60C98 61 96 63 95 65L93 68L91 72L89 77L88 82L87 88L86 95L86 100L87 105L88 110L89 115L91 120L93 124L95 128L98 131L102 133L106 133L110 131L113 128L115 124L117 120L119 115L120 110L121 105L121 100L120 95L119 88L118 82L117 77L115 72L113 68L111 65C109 63 107 61 105 60L100 58L100 60Z" 
            fill="#FFA500"
            opacity="0.6"
          />
        </svg>
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
