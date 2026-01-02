import React, { useState, useEffect } from 'react';
import { User, Video, Product, Collection, PageRoute } from '../types';
import { Menu, UserPlus, Grid, Lock, Heart, Bookmark, Play, ChevronDown, Coins, Edit3, QrCode, Footprints, ShoppingBag, Radio, FolderOpen, BarChart2, Loader, Repeat, Layers, ChevronRight, MessageCircleQuestion, Plus, Wifi, Cloud, Clock, AlertTriangle } from 'lucide-react';
import { MOCK_VIDEOS, formatNumber, MOCK_PRODUCTS } from '../constants';
import { backend } from '../services/backend';
import { OptimizedImage } from './OptimizedImage';
import { CreateCollectionModal } from './CreateCollectionModal';
import { supabase } from '../services/supabaseClient';

interface ProfileProps {
  user: User;
  videos: Video[];
  likedVideos?: Video[]; 
  bookmarkedVideos?: Video[]; 
  onOpenWallet: () => void;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenQRCode?: () => void;
  onVideoClick: (video: Video, index: number, allVideos: Video[]) => void;
  onViewDrafts?: () => void;
  onOpenProfileViews?: () => void; 
  onProductClick?: (product: Product) => void;
  onGoLive?: () => void;
  onOpenCreatorTools?: () => void;
  onOpenQA?: () => void;
  onOpenCollection?: (collection: Collection) => void; 
  onViewStory?: () => void;
  onNavigate?: (route: PageRoute) => void;
}

const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0 || isNaN(seconds)) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0 && secs === 0) return null;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const Profile: React.FC<ProfileProps> = ({ 
    user, 
    videos, 
    likedVideos = [], 
    bookmarkedVideos = [],
    onOpenWallet, 
    onEditProfile, 
    onOpenSettings, 
    onOpenQRCode, 
    onVideoClick, 
    onViewDrafts,
    onOpenProfileViews,
    onProductClick,
    onGoLive,
    onOpenCreatorTools,
    onOpenQA,
    onOpenCollection,
    onViewStory,
    onNavigate
}) => {
  const postedVideos = videos.filter(v => (v.user.id === user.id || v.isLocal) && !v.isDraft);
  
  const [activeTab, setActiveTab] = useState<'grid' | 'reposts' | 'likes' | 'favorites' | 'shop'>('grid');
  const [favoritesSubTab, setFavoritesSubTab] = useState<'all' | 'collections'>('all');
  
  const [showcaseProducts, setShowcaseProducts] = useState<Product[]>([]);
  const [loadingShop, setLoadingShop] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
      const channel = supabase.channel('profile_health')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            setIsSynced(true);
            setTimeout(() => setIsSynced(false), 2000);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
      if (activeTab === 'shop' && user.isSeller) {
          const loadShowcase = async () => {
              setLoadingShop(true);
              const myProducts = await backend.shop.getShowcase(user.id);
              setShowcaseProducts(myProducts.length > 0 ? myProducts : MOCK_PRODUCTS.slice(0, 4));
              setLoadingShop(false);
          };
          loadShowcase();
      }
      
      if (activeTab === 'favorites' && favoritesSubTab === 'collections') {
          const loadCollections = async () => {
              const cols = await backend.user.getCollections(user.id);
              setCollections(cols);
          };
          loadCollections();
      }
  }, [activeTab, favoritesSubTab, user.id, user.isSeller]);

  const handleCreateCollection = async (name: string, isPrivate: boolean) => {
      const newCol = await backend.user.createCollection(user.id, name, isPrivate);
      setCollections(prev => [newCol, ...prev]);
      setShowCreateCollection(false);
  };

  const handleVideoError = (id: string) => {
      setLoadErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-brand-indigo text-white pb-24 no-scrollbar">
      {/* Dynamic Header */}
      <div className="w-full h-32 bg-gradient-to-br from-brand-pink via-brand-orange to-brand-gold relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
         <div className={`absolute top-4 left-4 z-50 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-md border transition-all duration-500 ${isSynced ? 'bg-green-500/20 border-green-500/50 scale-110' : 'bg-black/20 border-white/10 opacity-60'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSynced ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`}></div>
            <span className="text-[8px] font-black tracking-tighter uppercase text-white">Live Sync</span>
         </div>
      </div>

      <div className="fixed top-0 w-full md:w-[28rem] flex justify-between items-center px-4 py-3 z-30 text-white drop-shadow-lg bg-gradient-to-b from-black/20 to-transparent">
        <button className="w-9 h-9 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-colors">
           <UserPlus size={18} />
        </button>
        <div className="flex items-center gap-1 font-black text-lg drop-shadow-md">
           {user.displayName} 
           <ChevronDown size={14} className="bg-white/20 rounded-full p-0.5" />
        </div>
        <div className="flex gap-2">
            <button onClick={onOpenProfileViews} className="w-9 h-9 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full relative">
               <Footprints size={18} />
               <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-pink rounded-full border-2 border-brand-indigo shadow-lg"></div>
            </button>
            <button onClick={onOpenCreatorTools} className="w-9 h-9 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full">
               <BarChart2 size={18} />
            </button>
            <button onClick={onOpenSettings} className="w-9 h-9 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full">
              <Menu size={18} />
            </button>
        </div>
      </div>

      <div className="flex flex-col items-center -mt-14 px-4 relative z-10">
        <div className="relative mb-3 group cursor-pointer" onClick={() => user.hasStory ? onViewStory?.() : onEditProfile?.()}>
          <div className={`w-[110px] h-[110px] rounded-full flex items-center justify-center ${user.hasStory ? 'p-[3px] bg-gradient-to-tr from-brand-pink via-brand-orange to-brand-gold animate-spin-slow' : 'bg-brand-indigo'}`}>
            <OptimizedImage 
              src={user.avatarUrl} 
              alt="profile" 
              className="w-full h-full rounded-full object-cover border-4 border-brand-indigo group-hover:scale-105 transition-transform"
            />
          </div>
          {!user.hasStory && (
              <div className="absolute bottom-2 right-2 bg-brand-pink p-1.5 rounded-full border-2 border-brand-indigo text-white shadow-lg">
                 <Edit3 size={14} />
              </div>
          )}
        </div>
        
        <h2 className="text-xl font-black mb-1 drop-shadow-sm">@{user.username}</h2>
        <button onClick={onOpenWallet} className="flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 px-5 py-2 rounded-full mb-6 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,215,0,0.1)]">
           <Coins size={16} className="text-brand-gold fill-brand-gold" />
           <span className="font-black text-sm text-brand-gold">{user.coins}</span>
           <div className="w-[1px] h-3 bg-brand-gold/30 mx-1"></div>
           <span className="text-[10px] uppercase font-black tracking-widest text-brand-pink">Recharge</span>
        </button>
        
        <div className="flex items-center gap-8 mb-6 text-center w-full justify-center text-white">
          <button onClick={() => onNavigate?.({ name: 'followers-list', user, type: 'following' })} className="flex flex-col items-center group">
            <span className="font-black text-xl group-hover:text-brand-pink transition-colors">{user.following}</span>
            <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Following</span>
          </button>
          <button onClick={() => onNavigate?.({ name: 'followers-list', user, type: 'followers' })} className="flex flex-col items-center border-x border-white/10 px-8 group">
            <span className="font-black text-xl group-hover:text-brand-gold transition-colors">{user.followers}</span>
            <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Followers</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="font-black text-xl">{user.likes}</span>
            <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Likes</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6 w-full justify-center px-4 max-w-sm">
           <button onClick={onEditProfile} className="flex-1 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-black hover:bg-white/10 transition-colors">Edit profile</button>
           <button onClick={onGoLive} className="flex-1 py-3.5 bg-brand-pink rounded-xl text-sm font-black shadow-lg flex items-center justify-center gap-2"><Radio size={18} /> Go LIVE</button>
           <button onClick={() => setActiveTab('favorites')} className="px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl"><Bookmark size={20} className="text-brand-gold" /></button>
        </div>

        <p className="text-sm text-center text-gray-200 px-4 leading-relaxed max-w-xs mb-2">{user.bio || 'Spread the joy! 🌍✨'}</p>
        <button onClick={onOpenQA} className="flex items-center gap-1.5 text-xs text-brand-pink font-black hover:underline mb-6"><MessageCircleQuestion size={16} /> Q&A</button>
      </div>

      <div className="flex border-b border-white/5 sticky top-[60px] bg-brand-indigo/95 backdrop-blur-md z-20 h-12">
         {[
           { id: 'grid', icon: Grid },
           { id: 'shop', icon: ShoppingBag, show: user.isSeller },
           { id: 'reposts', icon: Repeat },
           { id: 'favorites', icon: Bookmark, fill: true },
           { id: 'likes', icon: Heart }
         ].map(tab => (tab.show !== false) && (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex justify-center items-center relative transition-colors ${activeTab === tab.id ? 'text-brand-gold' : 'text-gray-500'}`}>
               <tab.icon size={22} className={activeTab === tab.id && tab.fill ? 'fill-current' : ''} />
               {activeTab === tab.id && <div className="absolute bottom-0 w-12 h-[3px] bg-brand-gold rounded-t-full shadow-[0_0_10px_rgba(255,215,0,0.6)]"></div>}
            </button>
         ))}
      </div>

      <div className={`min-h-[400px] ${activeTab === 'shop' ? 'p-3' : 'grid grid-cols-3 gap-[1px]'}`}>
         {activeTab === 'grid' && postedVideos.length === 0 && (
             <div className="col-span-3 py-20 text-center opacity-30 flex flex-col items-center gap-3">
                 <Radio size={48} />
                 <p className="font-bold text-sm uppercase tracking-widest">No posted vibes yet</p>
             </div>
         )}
         {activeTab === 'grid' && postedVideos.map((video, idx) => {
            const displayDur = formatDuration(video.duration);
            const hasError = loadErrors[video.id];
            return (
                <div key={video.id} className="aspect-[3/4] bg-brand-dark relative group cursor-pointer overflow-hidden" onClick={() => onVideoClick(video, idx, postedVideos)}>
                   {hasError ? (
                       <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gray-900 border border-white/5">
                           <AlertTriangle size={24} className="text-brand-pink mb-1" />
                           <span className="text-[8px] font-bold text-gray-500 uppercase">Stream Unavailable</span>
                       </div>
                   ) : (
                       <video 
                         className="w-full h-full object-cover bg-black" 
                         autoPlay
                         muted 
                         loop
                         playsInline
                         preload="metadata"
                         crossOrigin="anonymous"
                         onError={() => handleVideoError(video.id)}
                       >
                           <source src={video.url} type="video/mp4" />
                       </video>
                   )}
                   
                   <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-black drop-shadow-md text-white">
                      <Play size={10} fill="white" /> {formatNumber(video.likes)}
                   </div>
                   
                   {displayDur && (
                       <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
                          {displayDur}
                       </div>
                   )}
                   
                   <div className="absolute top-2 right-2 flex items-center justify-center p-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
                       {video.isLocal ? <Clock size={12} className="text-brand-gold animate-pulse" /> : <Cloud size={12} className="text-green-400" />}
                   </div>
                </div>
            );
         })}
      </div>

      {showCreateCollection && <CreateCollectionModal onClose={() => setShowCreateCollection(false)} onCreate={handleCreateCollection} />}
    </div>
  );
};