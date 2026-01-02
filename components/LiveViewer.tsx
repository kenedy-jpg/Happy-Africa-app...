
import React, { useState, useEffect, useRef } from 'react';
import { User, LiveComment, LiveStream, Product } from '../types';
import { X, Share2, MessageCircle, Gift, Heart, UserPlus, Send, Coins, Check, AlertCircle, Swords, Users, Gamepad2, ShoppingBag, Star } from 'lucide-react';
import { GiftPicker } from './GiftPicker';
import { Wallet } from './Wallet';
import { ProductDetail } from './ProductDetail'; 
import { LiveSubscription } from './LiveSubscription'; // New Import
import { formatNumber } from '../constants';
import { supabase } from '../services/supabaseClient';

interface LiveViewerProps {
  stream: LiveStream;
  currentUser: User;
  onClose: () => void;
  onRequireAuth: (cb: () => void) => void;
  isLoggedIn: boolean;
  isActive: boolean; // Control playback
  isFollowed?: boolean;
  onToggleFollow?: (userId: string) => void;
}

const FALLBACK_STREAM = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";

export const LiveViewer: React.FC<LiveViewerProps> = ({ 
    stream, 
    currentUser, 
    onClose, 
    onRequireAuth, 
    isLoggedIn, 
    isActive,
    isFollowed = false,
    onToggleFollow
}) => {
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [viewers, setViewers] = useState(stream.viewers);
  const [likes, setLikes] = useState(stream.likes);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false); // Sub Modal State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userCoins, setUserCoins] = useState(currentUser.coins);
  const [floatingHearts, setFloatingHearts] = useState<{id: number, x: number, y: number}[]>([]);
  const [floatingGifts, setFloatingGifts] = useState<{id: number, emoji: string}[]>([]);
  
  // PK State Simulation
  const [isPK, setIsPK] = useState(false);
  const [pkScores, setPkScores] = useState({ left: 0, right: 0 });
  
  // Live Shopping
  const [pinnedProduct, setPinnedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);

  // Video Loading
  const [currentSrc, setCurrentSrc] = useState(stream.streamUrl);
  const [hasError, setHasError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
        if (videoRef.current && !hasError) videoRef.current.play().catch(() => {});
        connectRealtime();
        
        // Mock PK for demo if category is Battle
        if (stream.category === 'Battle') {
            setTimeout(() => setIsPK(true), 3000);
        }
    } else {
        disconnectRealtime();
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }
    return () => disconnectRealtime();
  }, [isActive, stream.id, hasError]);

  const connectRealtime = () => {
      const channel = supabase.channel(`room_${stream.id}`, {
          config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'msg' }, ({ payload }) => {
            setComments(prev => [payload, ...prev].slice(0, 50));
        })
        .on('broadcast', { event: 'like' }, () => {
            spawnHeart(false); 
            setLikes(prev => prev + 1);
            if (isPK) setPkScores(p => ({ ...p, left: p.left + 1 }));
        })
        .on('broadcast', { event: 'gift' }, ({ payload }) => {
            const giftMsg: LiveComment = {
                id: Date.now().toString(),
                username: payload.sender,
                avatarUrl: '',
                text: `sent ${payload.name} ${payload.emoji}`,
                isSystem: true
            };
            setComments(prev => [giftMsg, ...prev].slice(0, 50));
            
            const gId = Date.now();
            setFloatingGifts(prev => [...prev, { id: gId, emoji: payload.emoji }]);
            setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.id !== gId)), 2000);
            
            if (isPK) setPkScores(p => ({ ...p, left: p.left + (payload.value * 10) }));
        })
        .on('broadcast', { event: 'pin_product' }, ({ payload }) => {
            setPinnedProduct(payload);
        })
        .on('broadcast', { event: 'unpin_product' }, () => {
            setPinnedProduct(null);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ user: currentUser.username || 'Guest', role: 'viewer' });
            }
        });

      channelRef.current = channel;
  };

  const disconnectRealtime = () => {
      if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }
  };

  const spawnHeart = (isMe: boolean) => {
      const id = Date.now() + Math.random();
      setFloatingHearts(prev => [...prev, { id, x: Math.random() * 40, y: 0 }]);
      setTimeout(() => {
          setFloatingHearts(prev => prev.filter(h => h.id !== id));
      }, 1000);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    onRequireAuth(async () => {
        const newComment: LiveComment = {
            id: Date.now().toString(),
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            text: commentText
        };
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
        if (channelRef.current) {
            await channelRef.current.send({ type: 'broadcast', event: 'msg', payload: newComment });
        }
    });
  };

  const handleLike = async () => {
     onRequireAuth(async () => {
         setLikes(prev => prev + 1);
         spawnHeart(true);
         if (isPK) setPkScores(p => ({ ...p, left: p.left + 1 }));
         if (channelRef.current) {
             await channelRef.current.send({ type: 'broadcast', event: 'like', payload: {} });
         }
     });
  };

  const handleSendGift = async (gift: any) => {
     if (userCoins >= gift.price) {
        setUserCoins(prev => prev - gift.price);
        setShowGiftPicker(false);
        const giftMsg: LiveComment = {
            id: Date.now().toString(),
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            text: `sent ${gift.name} ${gift.emoji}`,
            isSystem: true
        };
        setComments(prev => [giftMsg, ...prev]);
        const gId = Date.now();
        setFloatingGifts(prev => [...prev, { id: gId, emoji: gift.emoji }]);
        setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.id !== gId)), 2000);
        if (isPK) setPkScores(p => ({ ...p, left: p.left + (gift.price * 10) }));
        if (channelRef.current) {
            await channelRef.current.send({
                type: 'broadcast',
                event: 'gift',
                payload: { sender: currentUser.username, name: gift.name, emoji: gift.emoji, value: gift.price }
            });
        }
     } else {
        setShowWallet(true);
     }
  };

  const handleFollow = () => {
      onRequireAuth(() => {
          if (onToggleFollow) onToggleFollow(stream.host.id);
      });
  };

  const handleError = () => {
      if (currentSrc !== FALLBACK_STREAM) {
          setCurrentSrc(FALLBACK_STREAM);
          if (isActive && videoRef.current) videoRef.current.load();
      } else {
          setHasError(true);
      }
  };

  // Layout Logic
  const guests = stream.guests || [];
  const isMultiGuest = guests.length > 0;
  const isGaming = stream.isGaming;
  
  const getGridLayout = () => {
      const total = 1 + guests.length;
      if (total === 1) return 'grid-cols-1';
      if (total === 2) return 'grid-cols-1 grid-rows-2'; 
      if (total <= 4) return 'grid-cols-2 grid-rows-2';
      return 'grid-cols-3 grid-rows-3';
  };

  if (showProductDetail && pinnedProduct) {
      return (
          <div className="absolute inset-0 z-[80] bg-white animate-slide-up">
              <ProductDetail product={pinnedProduct} onBack={() => setShowProductDetail(false)} />
          </div>
      );
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden snap-center snap-always">
       {/* VIDEO CONTAINER */}
       <div className={`absolute inset-0 z-0 bg-gray-900 ${isGaming ? '' : `grid ${isPK ? 'grid-cols-2' : getGridLayout()} gap-0.5`}`}>
           {/* ... (Video Rendering Code from previous file remains same, omitted for brevity, logic unchanged) ... */}
           {isGaming ? (
               <>
                 <div className="w-full h-full relative overflow-hidden">
                     <img src="https://picsum.photos/800/1400?random=game_view" className="w-full h-full object-cover opacity-80" />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Gamepad2 size={48} className="text-white/30" /></div>
                 </div>
                 <div className="absolute bottom-20 right-4 w-24 h-32 rounded-lg overflow-hidden border border-brand-pink shadow-xl z-10 bg-black">
                     <video ref={videoRef} src={currentSrc} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                 </div>
               </>
           ) : (
               <>
                   <div className="relative w-full h-full overflow-hidden">
                       {currentSrc && !hasError ? (
                           <video ref={videoRef} src={currentSrc} loop muted={false} playsInline className="w-full h-full object-cover" onError={handleError} />
                       ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white/50 gap-2"><AlertCircle size={32} /><span className="text-xs font-bold">Stream unavailable</span></div>
                       )}
                       {(isPK || isMultiGuest) && <div className="absolute bottom-2 left-2 bg-brand-pink px-2 py-0.5 rounded text-[10px] text-white font-bold z-10">Host</div>}
                   </div>
                   {isPK && <div className="relative w-full h-full overflow-hidden bg-gray-800"><video src="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" autoPlay loop muted className="w-full h-full object-cover" /></div>}
                   {!isPK && guests.map(guest => (
                        <div key={guest.id} className="relative w-full h-full overflow-hidden bg-gray-800 border border-black">
                            <img src={guest.user.avatarUrl} className="w-full h-full object-cover opacity-70" />
                            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-bold">{guest.user.displayName}</div>
                        </div>
                   ))}
               </>
           )}
           <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none"></div>
       </div>

       {/* Top UI */}
       <div className="relative z-10 pt-safe px-4 pt-4 flex justify-between items-start pointer-events-none">
           <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full p-1 pr-4 border border-white/10 pointer-events-auto">
               <img src={stream.host.avatarUrl} className="w-8 h-8 rounded-full border border-brand-pink" />
               <div className="flex flex-col">
                   <span className="text-xs font-bold text-white">{stream.host.displayName}</span>
                   <span className="text-[9px] text-white/80">{formatNumber(stream.host.followers)} Followers</span>
               </div>
               
               {isFollowed ? (
                   <button onClick={handleFollow} className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full ml-1 flex items-center gap-1 border border-white/10">
                      <Check size={10} /> Following
                   </button>
               ) : (
                   <button onClick={handleFollow} className="bg-brand-gold text-black text-[10px] font-bold px-3 py-1 rounded-full ml-1 flex items-center gap-1">
                      <UserPlus size={10} /> Follow
                   </button>
               )}
           </div>

           <div className="flex gap-2 items-center pointer-events-auto">
               <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full flex flex-col items-center border border-white/10">
                   <span className="text-xs font-bold text-white">{formatNumber(viewers)}</span>
                   <span className="text-[8px] uppercase text-gray-300">Viewers</span>
               </div>
               <button onClick={onClose} className="w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10">
                   <X size={16} className="text-white" />
               </button>
           </div>
       </div>

       {/* Subscription Button (New) */}
       <div className="absolute top-20 left-4 z-20 pointer-events-auto">
           {isSubscribed ? (
               <div className="bg-brand-gold text-black px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg shadow-brand-gold/30">
                   <Star size={12} fill="black" /> Subscribed
               </div>
           ) : (
               <button 
                 onClick={() => onRequireAuth(() => setShowSubscription(true))}
                 className="bg-gradient-to-r from-brand-pink to-brand-orange text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg"
               >
                   <Star size={12} fill="white" /> Subscribe
               </button>
           )}
       </div>

       {/* Live Badge */}
       <div className="relative z-10 px-4 mt-8 flex gap-2 pointer-events-none">
           <span className="bg-brand-pink text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg shadow-brand-pink/50 animate-pulse">LIVE</span>
           <span className="bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 backdrop-blur-sm">{stream.category}</span>
           {isGaming && <span className="bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded">Gaming</span>}
       </div>

       <div className="absolute inset-0 z-0" onClick={handleLike}></div>

       {/* Bottom Chat Area */}
       <div className="absolute bottom-0 w-full z-10 h-1/3 px-4 flex flex-col justify-end pb-safe bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
           <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col-reverse mask-image-gradient pointer-events-auto">
              {comments.slice(0, 15).map(comment => (
                  <div key={comment.id} className="mb-2 flex items-start">
                     {comment.isSystem ? (
                         <div className="bg-brand-gold/20 border border-brand-gold/30 px-3 py-1 rounded-full text-xs text-brand-gold font-bold">
                            {comment.username} {comment.text}
                         </div>
                     ) : (
                         <div className="bg-black/30 px-3 py-1.5 rounded-xl max-w-[85%] backdrop-blur-sm flex items-center gap-2">
                             {/* Show sub badge if mock logic permits (e.g. if username matches current user and subscribed) */}
                             {isSubscribed && comment.username === currentUser.username && (
                                 <Star size={10} className="fill-brand-gold text-brand-gold" />
                             )}
                             <span className="text-xs font-bold text-gray-300">{comment.username}</span>
                             <span className="text-xs text-white">{comment.text}</span>
                         </div>
                     )}
                  </div>
              ))}
           </div>
           
           {/* Controls */}
           <div className="flex items-center gap-3 mt-3 mb-2 pointer-events-auto">
              <div className="flex-1 relative">
                 <input 
                   value={commentText}
                   onChange={(e) => setCommentText(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-full pl-4 pr-10 py-2.5 text-sm text-white outline-none placeholder-gray-400 backdrop-blur-md"
                   placeholder="Say hi..."
                   onFocus={() => onRequireAuth(() => {})}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                 />
                 <button onClick={handleSendComment} className={`absolute right-1 top-1 p-1.5 rounded-full ${commentText ? 'bg-brand-pink text-white' : 'text-gray-500'}`}><Send size={16} /></button>
              </div>
              
              <div className="flex gap-3 text-white items-center">
                 <button className="flex flex-col items-center" onClick={() => onRequireAuth(() => setShowGiftPicker(true))}>
                    <Gift size={28} className="text-white drop-shadow-md" />
                 </button>
                 <button className="flex flex-col items-center bg-white/10 p-2 rounded-full active:scale-90 transition-transform" onClick={handleLike}>
                    <Heart size={24} className="text-brand-pink fill-brand-pink" />
                 </button>
              </div>
           </div>
       </div>

       {showSubscription && (
           <LiveSubscription 
              host={stream.host}
              onClose={() => setShowSubscription(false)}
              onSubscribe={() => {
                  setIsSubscribed(true);
                  setShowSubscription(false);
                  // Trigger confetti or logic
              }}
           />
       )}

       {/* Gift and Wallet Modals (Same as before) */}
       {showGiftPicker && (
          <GiftPicker userCoins={userCoins} onSendGift={handleSendGift} onClose={() => setShowGiftPicker(false)} onRecharge={() => { setShowGiftPicker(false); setShowWallet(true); }} />
       )}
       {showWallet && (
           <Wallet currentBalance={userCoins} onClose={() => setShowWallet(false)} onBuy={(amount) => { setUserCoins(prev => prev + amount); setShowWallet(false); setShowGiftPicker(true); }} />
       )}
    </div>
  );
};
