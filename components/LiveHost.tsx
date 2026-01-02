
import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Video, Settings, Share2, MessageCircle, Heart, Gift, Camera as CameraIcon, RotateCcw, Zap, Wand2, Smile, AlertCircle, Swords, Users, Target, Trophy, Plus, Shield, Gamepad2, Monitor, Slash, MicOff, ShoppingBag, Pin } from 'lucide-react';
import { User, LiveComment, PKSession, LiveGoal, LiveGuest, Product } from '../types';
import { backend } from '../services/backend';
import { supabase } from '../services/supabaseClient';
import { MOCK_USERS, MOCK_PRODUCTS } from '../constants';

interface LiveHostProps {
  currentUser: User;
  onEnd: () => void;
}

type LiveState = 'setup' | 'live' | 'summary';

export const LiveHost: React.FC<LiveHostProps> = ({ currentUser, onEnd }) => {
  const [state, setState] = useState<LiveState>('setup');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Setup State
  const [title, setTitle] = useState("Just chilling! 🌍 #HappyAfrica");
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [isGamingMode, setIsGamingMode] = useState(false);
  
  // Live State
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [diamonds, setDiamonds] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  
  // PK & Multi-Guest State
  const [pkState, setPkState] = useState<'idle' | 'matching' | 'active'>('idle');
  const [pkSession, setPkSession] = useState<PKSession>({ isActive: false, scoreLocal: 0, scoreOpponent: 0, timeLeft: 0 });
  const [liveGoal, setLiveGoal] = useState<LiveGoal | null>(null);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  
  const [guests, setGuests] = useState<LiveGuest[]>([]);
  const [showGuestRequests, setShowGuestRequests] = useState(false);
  
  // Moderation
  const [showModeration, setShowModeration] = useState(false);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(['spam', 'bad', 'hate']);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [selectedComment, setSelectedComment] = useState<LiveComment | null>(null);
  
  // Live Shopping
  const [showShopSelector, setShowShopSelector] = useState(false);
  const [pinnedProductId, setPinnedProductId] = useState<string | null>(null);
  
  // Realtime Channel
  const channelRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
        stopCamera();
        cleanupRealtime();
        if (activeStreamId) {
            backend.live.endStream(activeStreamId);
        }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'user', 
            width: { ideal: 720 },
            height: { ideal: 1280 }
        }, 
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error", err);
      setCameraError("Camera/Microphone access needed for Live");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  };

  const cleanupRealtime = () => {
      if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleGoLive = async () => {
     if (cameraError) {
         alert("Cannot go live without camera access");
         return;
     }
     
     const streamId = await backend.live.startStream(currentUser.id, title, isGamingMode ? 'Gaming' : 'Talk');
     const actualId = streamId || `live_${Date.now()}`;
     setActiveStreamId(actualId);

     const channel = supabase.channel(`room_${actualId}`, {
         config: { broadcast: { self: false } }
     });

     channel
     .on('broadcast', { event: 'msg' }, ({ payload }) => {
         // MODERATION: Filter blocked keywords
         const hasBlocked = blockedKeywords.some(kw => payload.text.toLowerCase().includes(kw.toLowerCase()));
         // MODERATION: Filter muted users
         const isMuted = mutedUsers.has(payload.username);

         if (!hasBlocked && !isMuted) {
             setComments(prev => [payload, ...prev].slice(0, 50));
         }
     })
     .on('broadcast', { event: 'like' }, () => {
         setLikes(prev => prev + 1);
         if (pkState === 'active') setPkSession(prev => ({ ...prev, scoreLocal: prev.scoreLocal + 1 }));
         if (liveGoal && liveGoal.label.includes("Likes")) setLiveGoal(prev => prev ? ({ ...prev, current: prev.current + 1 }) : null);
     })
     .on('broadcast', { event: 'gift' }, ({ payload }) => {
         setDiamonds(prev => prev + payload.value);
         setComments(prev => [{
             id: Date.now().toString(),
             username: payload.sender,
             avatarUrl: '',
             text: `sent ${payload.name} ${payload.emoji}`,
             isSystem: true
         }, ...prev].slice(0, 50));
         
         if (pkState === 'active') setPkSession(prev => ({ ...prev, scoreLocal: prev.scoreLocal + (payload.value * 10) }));
         if (liveGoal && liveGoal.label.includes("Gifts")) setLiveGoal(prev => prev ? ({ ...prev, current: prev.current + 1 }) : null);
     })
     .subscribe(async (status) => {
         if (status === 'SUBSCRIBED') {
             await channel.track({ user: currentUser.username, role: 'host' });
         }
     });

     channelRef.current = channel;

     timerRef.current = window.setInterval(() => {
        setDurationSec(prev => prev + 1);
        
        // Simulate PK Opponent
        if (pkState === 'active') {
            setPkSession(prev => {
                if (prev.timeLeft <= 0) {
                    handleEndPK();
                    return prev;
                }
                const randomInc = Math.random() > 0.6 ? Math.floor(Math.random() * 50) : 0;
                return { ...prev, scoreOpponent: prev.scoreOpponent + randomInc, timeLeft: prev.timeLeft - 1 };
            });
        }
     }, 1000);

     setState('live');
  };

  const startPK = () => {
      setPkState('matching');
      setTimeout(() => {
          setPkState('active');
          setPkSession({
              isActive: true,
              opponent: MOCK_USERS[1], 
              scoreLocal: 0,
              scoreOpponent: 0,
              timeLeft: 300 // 5 min
          });
      }, 2000);
  };

  const handleEndPK = () => {
      setPkState('idle');
      setPkSession(prev => ({ ...prev, isActive: false }));
      alert(pkSession.scoreLocal > pkSession.scoreOpponent ? "You Won! 🎉" : "You Lost 😢");
  };

  const handleEndLive = async () => {
     cleanupRealtime();
     if (activeStreamId) {
         await backend.live.endStream(activeStreamId);
         setActiveStreamId(null);
     }
     setState('summary');
  };

  const handleSetGoal = (type: 'Likes' | 'Gifts') => {
      setLiveGoal({
          id: 'g1',
          label: `Get 100 ${type}`,
          target: 100,
          current: 0,
          icon: type === 'Likes' ? '❤️' : '🦁'
      });
      setShowGoalSetup(false);
  };

  const handleAddGuest = () => {
      if (guests.length >= 8) return; // Max 9 total (1 host + 8 guests)
      const newGuest: LiveGuest = {
          id: Date.now().toString(),
          user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
          isMuted: false,
          hasVideo: true
      };
      setGuests([...guests, newGuest]);
      setShowGuestRequests(false);
  };

  const handleRemoveGuest = (guestId: string) => {
      setGuests(guests.filter(g => g.id !== guestId));
  };

  const handleMuteUser = (username: string) => {
      setMutedUsers(prev => new Set(prev).add(username));
      setSelectedComment(null);
      alert(`Muted ${username}`);
  };

  const handlePinProduct = async (product: Product) => {
      setPinnedProductId(product.id);
      setShowShopSelector(false);
      
      if (channelRef.current) {
          await channelRef.current.send({
              type: 'broadcast',
              event: 'pin_product',
              payload: product
          });
      }
      
      // Auto-unpin after 30s
      setTimeout(() => {
          setPinnedProductId(null);
          channelRef.current?.send({ type: 'broadcast', event: 'unpin_product', payload: {} });
      }, 30000);
  };

  const formatTime = (seconds: number) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const addBlockedKeyword = (keyword: string) => {
      if (keyword && !blockedKeywords.includes(keyword)) {
          setBlockedKeywords([...blockedKeywords, keyword]);
      }
  };

  // --- RENDERERS ---

  if (state === 'summary') {
     return (
        <div className="absolute inset-0 bg-brand-indigo z-[100] flex flex-col items-center justify-center p-6 animate-fade-in">
           <h2 className="text-2xl font-bold text-white mb-8">Live Ended</h2>
           <div className="bg-brand-dark w-full rounded-xl p-6 border border-white/10 shadow-xl mb-8">
              <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                  <img src={currentUser.avatarUrl} className="w-16 h-16 rounded-full border-2 border-brand-pink" />
                  <div>
                      <p className="font-bold text-lg text-white">{currentUser.displayName}</p>
                      <p className="text-gray-400 text-sm">@{currentUser.username}</p>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-y-6">
                  <div className="flex flex-col"><span className="text-gray-400 text-xs uppercase">Viewers</span><span className="text-2xl font-bold text-white">{viewers}</span></div>
                  <div className="flex flex-col"><span className="text-gray-400 text-xs uppercase">Diamonds</span><span className="text-2xl font-bold text-brand-gold">{diamonds}</span></div>
                  <div className="flex flex-col"><span className="text-gray-400 text-xs uppercase">Likes</span><span className="text-2xl font-bold text-brand-pink">{likes}</span></div>
                  <div className="flex flex-col"><span className="text-gray-400 text-xs uppercase">Duration</span><span className="text-2xl font-bold text-white">{formatTime(durationSec)}</span></div>
              </div>
           </div>
           <button onClick={onEnd} className="w-full bg-white/10 py-4 rounded-full font-bold text-white hover:bg-white/20 transition-colors">Close</button>
        </div>
     );
  }

  // --- LAYOUT LOGIC ---
  const isMultiGuest = guests.length > 0;
  const isPK = pkState === 'active';
  
  const getGridLayout = () => {
      const total = 1 + guests.length;
      if (total === 1) return 'grid-cols-1';
      if (total === 2) return 'grid-cols-1 grid-rows-2'; // Vertical split
      if (total <= 4) return 'grid-cols-2 grid-rows-2';
      return 'grid-cols-3 grid-rows-3';
  };

  return (
    <div className="absolute inset-0 bg-black z-[60] flex flex-col">
       {/* MAIN STAGE AREA */}
       <div className={`absolute inset-0 z-0 bg-gray-900 ${isGamingMode ? '' : `grid ${isPK ? 'grid-cols-2' : getGridLayout()} gap-0.5`}`}>
          
          {isGamingMode ? (
              // GAMING MODE LAYOUT
              <>
                {/* Game Screen Placeholder */}
                <div className="w-full h-full relative overflow-hidden">
                    <img src="https://picsum.photos/800/1400?random=game" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-white/20 font-black text-6xl rotate-[-45deg]">GAME FEED</span>
                    </div>
                </div>
                
                {/* Host Camera (PiP) */}
                <div className="absolute bottom-20 right-4 w-32 h-48 rounded-xl overflow-hidden border-2 border-brand-pink shadow-2xl z-20">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
              </>
          ) : (
              // STANDARD / MULTI-GUEST / PK LAYOUT
              <>
                {/* Host Video */}
                <div className={`relative w-full h-full overflow-hidden ${isPK || isMultiGuest ? 'bg-gray-800' : ''}`}>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    {(isPK || isMultiGuest) && <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-bold">You</div>}
                </div>

                {/* PK Opponent */}
                {isPK && pkSession.opponent && (
                    <div className="relative w-full h-full overflow-hidden bg-gray-800">
                        <video src="https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" autoPlay loop muted className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-[10px] text-white font-bold">{pkSession.opponent.username}</div>
                    </div>
                )}

                {/* Guests Grid */}
                {!isPK && guests.map((guest) => (
                    <div key={guest.id} className="relative w-full h-full overflow-hidden bg-gray-800 border border-black">
                        <img src={guest.user.avatarUrl} className="w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Users size={32} className="text-white/50" />
                        </div>
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1">
                            {guest.isMuted && <MicOff size={8} className="text-red-500" />} {guest.user.displayName}
                        </div>
                        <button 
                            onClick={() => handleRemoveGuest(guest.id)} 
                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-red-500"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
              </>
          )}
          
          {/* PK Overlay Bar */}
          {isPK && (
              <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-[90%] h-12 z-20 flex flex-col items-center">
                  <div className="flex w-full h-3 rounded-full overflow-hidden border-2 border-white/20 shadow-lg relative">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${(pkSession.scoreLocal / (Math.max(1, pkSession.scoreLocal + pkSession.scoreOpponent))) * 100}%` }}></div>
                      <div className="h-full bg-gradient-to-l from-brand-pink to-red-500 flex-1 transition-all duration-500"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center border-2 border-white shadow-xl z-30">
                          <span className="text-[10px] font-black text-black">VS</span>
                      </div>
                  </div>
                  <div className="flex justify-between w-full mt-1 text-xs font-black text-white drop-shadow-md px-1">
                      <span className="text-blue-400">{pkSession.scoreLocal}</span>
                      <span className="text-white bg-black/30 px-2 rounded-full">{formatTime(pkSession.timeLeft)}</span>
                      <span className="text-brand-pink">{pkSession.scoreOpponent}</span>
                  </div>
              </div>
          )}

          {/* PK Matching Overlay */}
          {pkState === 'matching' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-none">
                  <div className="w-24 h-24 relative">
                      <div className="absolute inset-0 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border-4 border-brand-gold border-b-transparent rounded-full animate-spin-slow"></div>
                      <Swords className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" size={32} />
                  </div>
                  <p className="text-white font-bold mt-4 animate-pulse">Finding Opponent...</p>
              </div>
          )}
       </div>

       {/* SETUP MODE UI */}
       {state === 'setup' && (
          <div className="relative z-10 flex flex-col h-full bg-black/40 backdrop-blur-sm p-6 pt-safe pb-safe animate-fade-in">
             <div className="flex justify-between items-center mb-8">
                <button onClick={onEnd}><X size={28} className="text-white" /></button>
                <div className={`bg-black/40 px-3 py-1 rounded-full flex items-center gap-2 ${cameraError ? 'opacity-50' : ''}`}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-white">Great Connection</span>
                </div>
             </div>

             <div className="bg-brand-dark/80 p-4 rounded-xl flex gap-4 mb-6 border border-white/10">
                 <div className="w-20 h-20 bg-gray-800 rounded-lg relative overflow-hidden flex items-center justify-center">
                    <CameraIcon className="text-gray-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-bold">Edit Cover</div>
                 </div>
                 <div className="flex-1">
                    <input 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-transparent text-white font-bold text-lg w-full outline-none placeholder-gray-400"
                      placeholder="Add a title to chat..."
                    />
                    <div className="flex gap-2 mt-2">
                       <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-brand-pink">#HappyAfrica</span>
                       <button 
                         onClick={() => setIsGamingMode(!isGamingMode)}
                         className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${isGamingMode ? 'bg-brand-green text-white' : 'bg-white/10 text-gray-400'}`}
                       >
                           <Gamepad2 size={10} /> Gaming
                       </button>
                    </div>
                 </div>
             </div>

             <div className="mb-4">
                 <button onClick={() => setShowGoalSetup(true)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg w-full text-left hover:bg-white/20">
                     <Target size={20} className="text-brand-gold" />
                     <div className="flex-1">
                         <p className="text-sm font-bold text-white">{liveGoal ? liveGoal.label : "Set a Live Goal"}</p>
                     </div>
                     {liveGoal ? <div className="text-green-500 text-xs">Active</div> : <Plus size={16} className="text-white" />}
                 </button>
             </div>

             <div className="flex-1"></div>

             <div className="grid grid-cols-4 gap-4 mb-8">
                 {[{l: 'Flip', i: RotateCcw}, {l: 'Enhance', i: Wand2}, {l: 'Effects', i: Smile}, {l: 'Share', i: Share2}].map((opt, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 text-white opacity-80 hover:opacity-100 cursor-pointer">
                       <opt.i size={24} />
                       <span className="text-xs">{opt.l}</span>
                    </div>
                 ))}
             </div>

             <button 
               onClick={handleGoLive}
               disabled={!!cameraError}
               className={`w-full bg-brand-pink py-4 rounded-full font-bold text-white text-lg shadow-lg shadow-brand-pink/30 hover:brightness-110 active:scale-95 transition-all ${cameraError ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
             >
                Go LIVE
             </button>
          </div>
       )}

       {/* LIVE MODE UI */}
       {state === 'live' && (
          <div className="relative z-10 flex flex-col h-full pt-safe pb-safe pointer-events-none">
              {/* Top Bar */}
              <div className="flex justify-between items-start p-4 pointer-events-auto">
                  <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full p-1 pr-4">
                      <img src={currentUser.avatarUrl} className="w-9 h-9 rounded-full border border-brand-pink" />
                      <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{currentUser.username}</span>
                          <span className="text-[10px] text-brand-gold font-bold flex items-center gap-1"><Gift size={8} /> {diamonds}</span>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <div className="flex flex-col items-center bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg">
                          <span className="text-xs font-bold text-white">{viewers}</span>
                          <span className="text-xs uppercase text-gray-300">Viewers</span>
                      </div>
                      <button onClick={handleEndLive} className="w-9 h-9 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center"><X size={18} className="text-white" /></button>
                  </div>
              </div>

              {/* Goal Widget */}
              {liveGoal && (
                  <div className="absolute top-20 left-4 bg-black/40 backdrop-blur-md p-2 pr-4 rounded-full flex items-center gap-2 border border-brand-gold/30 pointer-events-auto animate-slide-right">
                      <div className="w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center text-lg shadow-lg">{liveGoal.icon}</div>
                      <div>
                          <p className="text-[10px] text-brand-gold font-bold uppercase">{liveGoal.label}</p>
                          <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-brand-pink transition-all duration-500" style={{ width: `${(liveGoal.current / liveGoal.target) * 100}%` }}></div>
                          </div>
                      </div>
                      <span className="text-xs font-bold text-white">{liveGoal.current}/{liveGoal.target}</span>
                  </div>
              )}

              {/* Pinned Product Status (Host View) */}
              {pinnedProductId && (
                  <div className="absolute top-36 left-4 bg-white/10 backdrop-blur-md p-2 rounded-lg flex items-center gap-2 border border-brand-pink pointer-events-auto">
                      <ShoppingBag size={16} className="text-brand-pink" />
                      <span className="text-xs font-bold text-white">Product Pinned</span>
                      <button onClick={() => setPinnedProductId(null)} className="ml-2 bg-black/50 rounded-full p-1"><X size={12} /></button>
                  </div>
              )}

              <div className="flex-1"></div>

              {/* Chat Area */}
              <div className="h-64 px-4 overflow-y-auto no-scrollbar mask-image-gradient pointer-events-auto">
                 <div className="flex flex-col gap-2 justify-end min-h-full pb-4">
                    {comments.map((comment) => (
                       <div key={comment.id} className="flex items-center gap-2 animate-slide-right cursor-pointer" onClick={() => setSelectedComment(comment)}>
                          {comment.isSystem ? (
                             <div className="bg-black/30 px-3 py-1 rounded-full text-xs text-white border border-white/5">
                                <span className="font-bold text-brand-gold">{comment.username}</span> {comment.text}
                             </div>
                          ) : (
                             <div className="flex items-start gap-2 bg-black/20 px-3 py-1.5 rounded-xl max-w-[80%] hover:bg-black/40 transition-colors">
                                <span className="text-xs font-bold text-gray-300 whitespace-nowrap">{comment.username}:</span>
                                <span className="text-xs text-white">{comment.text}</span>
                             </div>
                          )}
                       </div>
                    ))}
                 </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3 px-4 pb-2 pointer-events-auto">
                 <div className="flex gap-4 overflow-x-auto no-scrollbar">
                     <button onClick={() => setShowShopSelector(true)} className="bg-white text-brand-pink text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 shadow-lg active:scale-95">
                         <ShoppingBag size={16} /> Shop
                     </button>
                     <button onClick={startPK} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 shadow-lg active:scale-95" disabled={pkState !== 'idle'}>
                         <Swords size={16} /> PK Battle
                     </button>
                     <button onClick={() => setShowGuestRequests(true)} className="bg-black/40 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 border border-white/20 active:scale-95">
                         <Users size={16} /> Guests ({guests.length})
                     </button>
                     <button className="bg-black/40 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1 border border-white/20">
                         <Target size={16} /> Goals
                     </button>
                 </div>

                 <div className="flex items-center gap-3 border-t border-white/5 pt-2">
                    <div className="flex-1 bg-black/30 rounded-full px-4 py-2 text-gray-400 text-sm flex items-center gap-2">
                        <MessageCircle size={16} />
                        <span>Say something...</span>
                    </div>
                    <div className="flex gap-3 text-white">
                        <button onClick={() => setShowModeration(true)}><Settings size={24} className="opacity-80" /></button>
                        <Gift size={24} className="opacity-80" />
                        <Share2 size={24} className="opacity-80" />
                    </div>
                 </div>
              </div>
          </div>
       )}

       {/* MODALS */}
       
       {/* Shop Selector */}
       {showShopSelector && (
           <div className="absolute inset-0 z-[70] bg-black/80 flex items-end justify-center">
               <div className="bg-brand-dark w-full rounded-t-2xl p-4 pb-safe animate-slide-up border-t border-white/10 h-[50vh] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="font-bold text-white">Select Product to Pin</h3>
                       <button onClick={() => setShowShopSelector(false)}><X size={20} className="text-white" /></button>
                   </div>
                   <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                       {MOCK_PRODUCTS.map(p => (
                           <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                               <img src={p.image} className="w-12 h-12 object-cover rounded bg-white" />
                               <div className="flex-1">
                                   <p className="text-white text-sm font-bold line-clamp-1">{p.name}</p>
                                   <p className="text-brand-pink font-bold text-xs">${p.price}</p>
                               </div>
                               <button 
                                 onClick={() => handlePinProduct(p)}
                                 className="bg-brand-pink text-white px-3 py-1.5 rounded-full text-xs font-bold"
                               >
                                   Pin
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
       )}

       {/* Goal Setup */}
       {showGoalSetup && (
           <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-brand-dark w-full rounded-2xl p-6 border border-white/10 animate-slide-up">
                   <h3 className="text-white font-bold text-lg mb-4 text-center">Set Live Goal</h3>
                   <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => handleSetGoal('Likes')} className="bg-white/10 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/20"><Heart className="text-red-500" size={32} /><span className="text-white font-bold text-sm">Get Likes</span></button>
                       <button onClick={() => handleSetGoal('Gifts')} className="bg-white/10 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/20"><Gift className="text-brand-gold" size={32} /><span className="text-white font-bold text-sm">Get Gifts</span></button>
                   </div>
                   <button onClick={() => setShowGoalSetup(false)} className="mt-6 w-full py-3 text-gray-400 font-bold">Cancel</button>
               </div>
           </div>
       )}

       {/* Guest Requests */}
       {showGuestRequests && (
           <div className="absolute inset-0 z-[70] bg-black/80 flex items-end sm:items-center justify-center">
               <div className="bg-brand-dark w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-safe animate-slide-up border border-white/10">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-white font-bold text-lg">Guest Requests</h3>
                       <button onClick={() => setShowGuestRequests(false)}><X className="text-white" /></button>
                   </div>
                   <div className="flex flex-col gap-3">
                       <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                           <div className="flex items-center gap-3">
                               <img src="https://picsum.photos/50/50?random=guest" className="w-10 h-10 rounded-full" />
                               <div><p className="text-white font-bold text-sm">random_fan_99</p><p className="text-gray-400 text-xs">Sent 2m ago</p></div>
                           </div>
                           <button onClick={handleAddGuest} className="bg-brand-pink text-white px-4 py-1.5 rounded-full text-xs font-bold">Accept</button>
                       </div>
                       <p className="text-center text-gray-500 text-xs mt-2">Up to 9 guests supported</p>
                   </div>
               </div>
           </div>
       )}

       {/* Comment Actions (Mute/Kick) */}
       {selectedComment && (
           <div className="absolute inset-0 z-[80] bg-black/50 flex items-center justify-center p-8" onClick={() => setSelectedComment(null)}>
               <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden p-4">
                   <p className="font-bold text-black mb-1">@{selectedComment.username}</p>
                   <p className="text-gray-600 text-sm mb-4">"{selectedComment.text}"</p>
                   <div className="flex flex-col gap-2">
                       <button onClick={() => handleMuteUser(selectedComment.username)} className="w-full py-3 bg-gray-100 rounded-lg font-bold text-black">Mute User</button>
                       <button className="w-full py-3 bg-red-100 text-red-600 rounded-lg font-bold">Block User</button>
                   </div>
               </div>
           </div>
       )}

       {/* Moderation Panel */}
       {showModeration && (
           <div className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-brand-dark w-full rounded-2xl p-6 border border-white/10 animate-slide-up">
                   <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Shield className="text-brand-pink" /> Moderation</h3>
                   
                   <div className="mb-4">
                       <p className="text-gray-400 text-xs mb-2 uppercase font-bold">Blocked Keywords</p>
                       <div className="flex flex-wrap gap-2 mb-2">
                           {blockedKeywords.map(kw => (
                               <span key={kw} className="bg-white/10 px-2 py-1 rounded text-xs text-white flex items-center gap-1">{kw} <X size={10} className="cursor-pointer" onClick={() => setBlockedKeywords(blockedKeywords.filter(k => k !== kw))} /></span>
                           ))}
                       </div>
                       <div className="flex gap-2">
                           <input id="kw-input" className="flex-1 bg-white/5 rounded px-2 py-1 text-white text-sm outline-none" placeholder="Add keyword" />
                           <button onClick={() => { const el = document.getElementById('kw-input') as HTMLInputElement; addBlockedKeyword(el.value); el.value = ''; }} className="bg-white/20 px-3 rounded text-white text-xs font-bold">Add</button>
                       </div>
                   </div>

                   <div className="flex flex-col gap-2 mt-6">
                       <button className="bg-white/10 p-4 rounded-xl text-left hover:bg-white/20"><span className="text-white font-bold text-sm">Mute All Viewers</span></button>
                       <button className="bg-white/10 p-4 rounded-xl text-left hover:bg-white/20"><span className="text-white font-bold text-sm">Clear Chat</span></button>
                   </div>
                   <button onClick={() => setShowModeration(false)} className="mt-6 w-full py-3 text-gray-400 font-bold">Close</button>
               </div>
           </div>
       )}
    </div>
  );
};
