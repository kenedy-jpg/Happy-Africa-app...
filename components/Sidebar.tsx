
import React from 'react';
import { Home, Users, Compass, Video, Radio, DownloadCloud, UserCheck, MapPin } from 'lucide-react';
import { Tab, FeedType } from '../types';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: Tab;
  feedType: FeedType;
  isLive: boolean;
  onTabChange: (tab: Tab) => void;
  onFeedTypeChange: (type: FeedType) => void;
  onLiveToggle: (isOpen: boolean) => void;
  onGoLive?: () => void;
  installPrompt?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  feedType, 
  isLive, 
  onTabChange, 
  onFeedTypeChange,
  onLiveToggle,
  onGoLive,
  installPrompt
}) => {
  
  const isForYouActive = activeTab === 'home' && feedType === 'foryou' && !isLive;
  const isFollowingActive = activeTab === 'home' && feedType === 'following' && !isLive;
  const isFriendsActive = activeTab === 'home' && feedType === 'friends' && !isLive;
  const isNearbyActive = activeTab === 'home' && feedType === 'nearby' && !isLive;
  const isExploreActive = activeTab === 'discover';
  const isLiveActive = isLive;

  const getButtonClass = (isActive: boolean, color: 'gold' | 'pink' = 'gold') => {
      const activeStyles = color === 'gold' 
        ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30 shadow-[0_0_20px_rgba(255,215,0,0.1)]'
        : 'bg-brand-pink/10 text-brand-pink border-brand-pink/30 shadow-[0_0_20px_rgba(255,79,154,0.1)]';
      
      return `flex items-center gap-3 p-3.5 rounded-xl transition-all w-full text-left ${
          isActive 
          ? `${activeStyles} font-black border scale-[1.02]` 
          : 'hover:bg-white/5 text-white/80 font-bold hover:text-brand-gold'
      }`;
  };

  return (
    <div className="hidden md:flex flex-col w-72 border-r border-white/5 h-full p-6 overflow-y-auto bg-brand-indigo no-scrollbar">
      <div className="mb-10 cursor-pointer" onClick={() => { onTabChange('home'); onFeedTypeChange('foryou'); }}>
          <BrandLogo size="md" className="!items-start" />
      </div>

      <nav className="flex flex-col gap-1.5 mb-8">
        {/* For You - Pink */}
        <button 
          onClick={() => { onTabChange('home'); onFeedTypeChange('foryou'); onLiveToggle(false); }} 
          className={getButtonClass(isForYouActive, 'pink')}
        >
           <Home size={26} className={isForYouActive ? "text-brand-pink" : "text-white"} />
           For You
        </button>

        {/* Following - Gold */}
        <button 
          onClick={() => { onFeedTypeChange('following'); onLiveToggle(false); }} 
          className={getButtonClass(isFollowingActive, 'gold')}
        >
           <Users size={26} className={isFollowingActive ? "text-brand-gold" : "text-white"} />
           Following
        </button>

        {/* Friends - Gold */}
        <button 
          onClick={() => { onFeedTypeChange('friends'); onLiveToggle(false); }} 
          className={getButtonClass(isFriendsActive, 'gold')}
        >
           <UserCheck size={26} className={isFriendsActive ? "text-brand-gold" : "text-white"} />
           Friends
        </button>

        {/* Nearby - Pink */}
        <button 
          onClick={() => { onFeedTypeChange('nearby'); onLiveToggle(false); }} 
          className={getButtonClass(isNearbyActive, 'pink')}
        >
           <MapPin size={26} className={isNearbyActive ? "text-brand-pink" : "text-white"} />
           Nearby
        </button>

        <button 
          onClick={() => { onTabChange('discover'); onLiveToggle(false); }} 
          className={getButtonClass(isExploreActive, 'gold')}
        >
           <Compass size={26} className={isExploreActive ? "text-brand-gold" : "text-white"} />
           Explore
        </button>

        <button 
          onClick={() => onLiveToggle(true)} 
          className={getButtonClass(isLiveActive, 'pink')}
        >
           <Video size={26} className={isLiveActive ? "text-brand-pink" : "text-white"} />
           LIVE
        </button>

        <button onClick={onGoLive} className="flex items-center gap-3 p-3.5 mt-4 rounded-xl bg-brand-pink/10 border border-brand-pink/50 text-brand-pink font-black hover:bg-brand-pink/20 group transition-all">
           <Radio size={22} className="animate-pulse" />
           Go LIVE Now
        </button>
      </nav>

      <div className="border-t border-white/5 pt-8">
        <p className="text-[10px] font-black text-gray-500 mb-5 uppercase tracking-widest">Recommended Vibe</p>
        <div className="flex flex-col gap-4">
           {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-all">
                 <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-brand-pink to-brand-gold">
                    <img src={`https://picsum.photos/100/100?random=${i}`} className="w-full h-full rounded-full border-2 border-brand-indigo object-cover" />
                 </div>
                 <div className="min-w-0">
                    <p className="text-sm font-black truncate group-hover:text-brand-gold transition-colors">creator_africa_{i}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Trending</p>
                 </div>
              </div>
           ))}
        </div>
      </div>
      
      <div className="mt-auto pt-8 border-t border-white/5 text-[10px] text-gray-600 font-bold">
         {installPrompt && (
             <button onClick={() => installPrompt.prompt()} className="w-full mb-6 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                 <DownloadCloud size={18} className="text-brand-gold" />
                 INSTALL HAPPY AFRICA
             </button>
         )}
         <p className="mb-2">© 2025 Happy Africa Global</p>
         <p className="uppercase tracking-widest text-brand-pink">Made for the World</p>
      </div>
    </div>
  );
};
