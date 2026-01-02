import React, { useState, useEffect, useRef } from 'react';
import { BottomNav } from './components/BottomNav';
import { VideoFeed } from './components/VideoFeed';
import { Profile } from './components/Profile';
import { Upload } from './components/Upload';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { GiftPicker } from './components/GiftPicker';
import { Wallet } from './components/Wallet';
import { CommentsSheet } from './components/CommentsSheet';
import { Discover } from './components/Discover';
import { SplashScreen } from './components/SplashScreen';
import { LiveFeed } from './components/LiveFeed'; 
import { ChatWindow } from './components/ChatWindow';
import { ShareSheet } from './components/ShareSheet'; 
import { SoundDetail } from './components/SoundDetail';
import { HashtagDetail } from './components/HashtagDetail';
import { EditProfile } from './components/EditProfile';
import { Settings } from './components/Settings';
import { QRCodeCard } from './components/QRCodeCard';
import { Inbox } from './components/Inbox';
import { UserProfile } from './components/UserProfile';
import { Toast } from './components/Toast';
import { Shop } from './components/Shop';
import { ProductDetail } from './components/ProductDetail';
import { OrdersList } from './components/OrdersList';
import { CreatorTools } from './components/CreatorTools'; 
import { StoryViewer } from './components/StoryViewer'; 
import { AffiliateMarketplace } from './components/AffiliateMarketplace'; 
import { CreatorMarketplace } from './components/CreatorMarketplace'; 
import { QAModal } from './components/QAModal'; 
import { QRScanner } from './components/QRScanner'; 
import { CollectionDetail } from './components/CollectionDetail'; 
import { LocationExplorer } from './components/LocationExplorer'; 
import { HomeHeader } from './components/HomeHeader';
import { FollowersList } from './components/FollowersList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_VIDEOS, CURRENT_USER, MOCK_USERS } from './constants';
import { Tab, Video, FeedType, User, PageRoute, CreationContext, ChatSession } from './types';
import { RefreshCcw, WifiOff, CloudOff } from 'lucide-react';
import { injectVideo, markNotInterested, claimLocalVideos } from './services/recommendationEngine';
import { backend } from './services/backend';
import { supabase, setSupabaseToken, checkDbConnection } from './services/supabaseClient'; 

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [feedRefreshTrigger, setFeedRefreshTrigger] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<{user: string, avatar: string, text: string, type: string} | null>(null);
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [bookmarkedVideoIds, setBookmarkedVideoIds] = useState<Set<string>>(new Set());
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [isMuted, setIsMuted] = useState(true); 
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [showQAModal, setShowQAModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Integration: Session Debugging & Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log("[Auth] Initial Session Status:", data.session ? "Active" : "None");
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] Event Change:", event);
      
      if (['SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
          if (session) {
             setSupabaseToken(session.access_token);
             const user = await backend.auth.getProfile(session.user.id);
             if (user) {
                 setIsLoggedIn(true);
                 setCurrentUser(user);
                 backend.auth.setUser(user);
                 syncUserState(user.id);
                 claimLocalVideos(user);
             }
          }
      }
      
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setCurrentUser(CURRENT_USER);
        backend.auth.setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
        if (isAuthLoading) {
            setIsAuthLoading(false);
            console.warn("[App] Auth loading timed out. Proceeding.");
        }
    }, 8000); // Wait up to 8s for slow mobile networks

    const initApp = async () => {
      try {
        // Attempt connection check. If it takes > 5s, assume we might be offline or slow
        const isConnected = await Promise.race([
            checkDbConnection(),
            new Promise<boolean>(res => setTimeout(() => res(true), 5000)) // Fallback to "online" to avoid blocking UI
        ]);
        
        // Only set offline mode if checkDbConnection explicitly returns false (not the timeout true)
        const dbReallyDown = await checkDbConnection().catch(() => false);
        setIsOfflineMode(!dbReallyDown);

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
           const user = await backend.auth.getProfile(session.user.id);
           if (user) {
              setIsLoggedIn(true);
              setCurrentUser(user);
              setSupabaseToken(session.access_token);
              syncUserState(user.id);
              claimLocalVideos(user);
              backend.auth.setUser(user);
           }
        }
      } catch (e) {
        console.error("[App] Auth init failed:", e);
        // Don't set offline mode purely on exception unless confirmed
      } finally {
        setIsAuthLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    initApp();

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
        const splashTimer = setTimeout(() => setShowSplash(false), 1500);
        return () => clearTimeout(splashTimer);
    }
  }, [isAuthLoading]);

  const syncUserState = async (userId: string) => {
      try {
          const [interactions, chats, notifs, videos] = await Promise.all([
              backend.user.getUserInteractions(userId),
              backend.messaging.getConversations(userId),
              backend.notifications.getNotifications(userId),
              backend.content.getMyVideos(userId)
          ]);
          setLikedVideoIds(new Set(interactions.likedVideoIds));
          setFollowedUserIds(new Set(interactions.followedUserIds));
          setBookmarkedVideoIds(new Set(interactions.bookmarkedVideoIds));
          setChatSessions(chats);
          setNotifications(notifs);
          setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
          setMyVideos(videos);
          console.log("[Sync] User state hydrated from cloud.");
      } catch (e) { 
          console.warn("[Sync] State sync failed or interrupted. Using local cache."); 
      }
  };

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [feedType, setFeedType] = useState<FeedType>('foryou'); 
  const [activeSheet, setActiveSheet] = useState<'none' | 'comments' | 'share' | 'gift' | 'wallet' | 'location'>('none');
  const [sheetData, setSheetData] = useState<any>(null); 
  const [pageStack, setPageStack] = useState<PageRoute[]>([]);
  const [creationContext, setCreationContext] = useState<CreationContext>({ type: 'normal' });
  const [editingDraft, setEditingDraft] = useState<Video | null>(null);

  const handleRequireAuth = (action: () => void) => {
    if (isLoggedIn) action();
    else {
        setAuthMode('signup');
        setShowAuthModal(true);
    }
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === 'home' && activeTab === 'home') { setFeedRefreshTrigger(prev => prev + 1); return; }
    if (['upload', 'inbox', 'profile'].includes(tab)) {
      handleRequireAuth(() => {
          if (tab === 'upload') { setCreationContext({ type: 'normal' }); setEditingDraft(null); }
          setActiveTab(tab);
      });
    } else setActiveTab(tab);
  };

  const handleUpload = async (newVideo: Video, file?: File) => {
    if (!isLoggedIn) {
        setEditingDraft(newVideo);
        setAuthMode('signup');
        setShowAuthModal(true);
        return;
    }
    try {
        injectVideo({ ...newVideo, isLocal: true });
        setMyVideos(prev => [{ ...newVideo, isLocal: true }, ...prev]);
        setActiveTab('profile');

        if (file) {
            await backend.content.uploadVideo(file, newVideo.description, newVideo.poster, newVideo.duration);
            await syncUserState(currentUser.id);
        }
        
        setFeedRefreshTrigger(prev => prev + 1); 
        setActiveToast({ user: 'System', avatar: '', text: 'Video Sync Complete! 🌍', type: 'system' });
    } catch (e: any) { 
        setActiveToast({ user: 'System', avatar: '', text: `Upload failed: ${e.message}`, type: 'error' }); 
    }
  };

  const handleLogout = async () => {
      await backend.auth.logout();
      window.location.reload();
  };

  const pushPage = (route: PageRoute) => setPageStack(prev => [...prev, route]);
  const popPage = () => setPageStack(prev => prev.slice(0, -1));

  const handleToggleLike = async (videoId: string) => {
      const next = new Set(likedVideoIds);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      setLikedVideoIds(next);
      await backend.content.toggleLike(videoId);
  };

  const handleToggleFollow = async (userId: string) => {
      const next = new Set(followedUserIds);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      setFollowedUserIds(next);
      await backend.user.toggleFollow(userId);
  };

  const renderActivePage = () => {
      if (pageStack.length > 0) {
          const page = pageStack[pageStack.length - 1];
          switch (page.name) {
              case 'user-profile': return <UserProfile user={page.user} onBack={popPage} onVideoClick={(v, i, all) => pushPage({name: 'video-detail', videos: all, initialIndex: i})} isFollowed={followedUserIds.has(page.user.id)} onToggleFollow={handleToggleFollow} onRequireAuth={handleRequireAuth} onNavigate={pushPage} />;
              case 'sound': return <SoundDetail id={page.id} title={page.title} artist={page.subtitle} cover={page.cover} audioUrl={page.audioUrl} allVideos={MOCK_VIDEOS} onBack={popPage} onVideoClick={(v, i, all) => pushPage({name: 'video-detail', videos: all, initialIndex: i})} onUseSound={(t) => { setCreationContext({type: 'sound', track: t}); setActiveTab('upload'); popPage(); }} />;
              case 'hashtag': return <HashtagDetail id={page.id} allVideos={MOCK_VIDEOS} onBack={popPage} onVideoClick={(v, i, all) => pushPage({name: 'video-detail', videos: all, initialIndex: i})} onJoinHashtag={(tag) => { setCreationContext({type: 'hashtag', tag}); setActiveTab('upload'); popPage(); }} />;
              case 'edit-profile': return <EditProfile user={currentUser} onCancel={popPage} onSave={(u) => { setCurrentUser(u); popPage(); }} />;
              case 'settings': return <Settings user={currentUser} onBack={popPage} onLogout={handleLogout} isDataSaver={isDataSaver} onToggleDataSaver={() => setIsDataSaver(!isDataSaver)} />;
              case 'qr-code': return <QRCodeCard user={page.user} onClose={popPage} />;
              case 'video-detail': return <VideoFeed type="custom" initialVideos={page.videos} initialIndex={page.initialIndex} onBack={popPage} onOpenComments={(id) => { setSheetData(id); setActiveSheet('comments'); }} onOpenShare={(v) => { setSheetData(v); setActiveSheet('share'); }} onOpenGift={() => setActiveSheet('gift')} onRequireAuth={handleRequireAuth} isLoggedIn={isLoggedIn} likedVideoIds={likedVideoIds} onToggleLike={handleToggleLike} followedUserIds={followedUserIds} onToggleFollow={handleToggleFollow} onNavigate={pushPage} isDataSaver={isDataSaver} onOpenLocation={(l) => { setSheetData(l); setActiveSheet('location'); }} isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />;
              case 'shop': return <Shop onNavigate={pushPage} onBack={popPage} />;
              case 'product-detail': return <ProductDetail product={page.product} onBack={popPage} />;
              case 'orders': return <OrdersList onBack={popPage} />;
              case 'creator-tools': return <CreatorTools onBack={popPage} onNavigate={pushPage} />;
              case 'affiliate-marketplace': return <AffiliateMarketplace onBack={popPage} />;
              case 'creator-marketplace': return <CreatorMarketplace onBack={popPage} onNavigateProfile={(u) => pushPage({name: 'user-profile', user: u})} />;
              case 'story-viewer': return <StoryViewer user={page.user} onClose={popPage} />;
              case 'collection-detail': return <CollectionDetail collection={page.collection} onBack={popPage} onVideoClick={(v) => pushPage({name: 'video-detail', videos: [v], initialIndex: 0})} />;
              case 'followers-list': return <FollowersList user={page.user} type={page.type} onBack={popPage} onNavigateProfile={(u) => pushPage({name: 'user-profile', user: u})} followedUserIds={followedUserIds} onToggleFollow={handleToggleFollow} />;
              default: return null;
          }
      }

      switch (activeTab) {
          case 'home': return (
            <div className="relative h-full w-full">
              <HomeHeader 
                activeFeed={feedType} 
                onFeedChange={(t) => { setActiveTab('home'); setFeedType(t); }} 
                onSearchClick={() => setActiveTab('discover')} 
                onLiveClick={() => setActiveTab('live')} 
                isLoggedIn={isLoggedIn}
                onSignIn={() => { setAuthMode('login'); setShowAuthModal(true); }}
                onSignUp={() => { setAuthMode('signup'); setShowAuthModal(true); }}
              />
              <VideoFeed type={feedType} refreshTrigger={feedRefreshTrigger} onOpenComments={(id) => { setSheetData(id); setActiveSheet('comments'); }} onOpenShare={(v) => { setSheetData(v); setActiveSheet('share'); }} onOpenGift={() => setActiveSheet('gift')} onRequireAuth={handleRequireAuth} isLoggedIn={isLoggedIn} onNavigate={pushPage} likedVideoIds={likedVideoIds} onToggleLike={handleToggleLike} followedUserIds={followedUserIds} onToggleFollow={handleToggleFollow} isDataSaver={isDataSaver} onOpenLocation={(l) => { setSheetData(l); setActiveSheet('location'); }} isMuted={isMuted} onToggleMute={() => setIsMuted(!isMuted)} />
            </div>
          );
          case 'discover': return <Discover onVideoClick={(v) => pushPage({name: 'video-detail', videos: [v], initialIndex: 0})} onNavigate={pushPage} onScanQR={() => setShowQRScanner(true)} />;
          case 'upload': return <Upload currentUser={currentUser} onUpload={handleUpload} onCancel={() => setActiveTab('home')} creationContext={creationContext} draft={editingDraft} />;
          case 'inbox': return <Inbox notifications={notifications} chatSessions={chatSessions} onOpenChat={(u) => { const session = chatSessions.find(s => s.user.id === u.id) || { id: `new_${u.id}`, user: u, messages: [], lastMessage: '', lastMessageTime: '', unreadCount: 0 }; setActiveChatSessionId(session.id); }} />;
          case 'profile': return <Profile user={currentUser} videos={myVideos} onOpenWallet={() => setActiveSheet('wallet')} onEditProfile={() => pushPage({name: 'edit-profile'})} onOpenSettings={() => pushPage({name: 'settings'})} onOpenQRCode={() => pushPage({name: 'qr-code', user: currentUser})} onVideoClick={(v, i, all) => pushPage({name: 'video-detail', videos: all, initialIndex: i})} onOpenCreatorTools={() => pushPage({name: 'creator-tools'})} onOpenQA={() => setShowQAModal(true)} onOpenCollection={(c) => pushPage({name: 'collection-detail', collection: c})} onViewStory={() => pushPage({name: 'story-viewer', user: currentUser})} onNavigate={pushPage} />;
          case 'live': return <LiveFeed currentUser={currentUser} onClose={() => setActiveTab('home')} onRequireAuth={handleRequireAuth} isLoggedIn={isLoggedIn} followedUserIds={followedUserIds} onToggleFollow={handleToggleFollow} />;
          case 'shop': return <Shop onNavigate={pushPage} />;
          default: return null;
      }
  };

  return (
    <ErrorBoundary>
        <div className="flex h-full w-full bg-brand-indigo overflow-hidden relative border-[8px] border-brand-pink shadow-[inset_0_0_25px_rgba(255,79,154,0.6)]">
          {showSplash && <SplashScreen />}
          
          {isOfflineMode && !isAuthLoading && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-orange-600/95 backdrop-blur-md text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/20 shadow-2xl animate-pulse">
                  <CloudOff size={14} />
                  <span>Cloud Sync Unreachable - Local Database Active</span>
                  <button onClick={() => window.location.reload()} className="bg-white/20 p-1 rounded-full"><RefreshCcw size={12}/></button>
              </div>
          )}

          <Sidebar activeTab={activeTab} feedType={feedType} isLive={activeTab === 'live'} onTabChange={handleTabChange} onFeedTypeChange={(t) => { setActiveTab('home'); setFeedType(t); }} onLiveToggle={(open) => setActiveTab(open ? 'live' : 'home')} onGoLive={() => handleRequireAuth(() => setActiveTab('upload'))} />
          <main className="flex-1 h-full relative">
              {!isAuthLoading && renderActivePage()}
              {activeTab !== 'upload' && pageStack.length === 0 && !isAuthLoading && (
                  <BottomNav activeTab={activeTab} onTabChange={handleTabChange} isTransparent={activeTab === 'home' || activeTab === 'live'} unreadCount={unreadCount} />
              )}
              {activeSheet === 'comments' && <CommentsSheet videoId={sheetData} currentUser={currentUser} onClose={() => setActiveSheet('none')} onRequireAuth={handleRequireAuth} isLoggedIn={isLoggedIn} />}
              {activeSheet === 'share' && <ShareSheet video={sheetData} onClose={() => setActiveSheet('none')} onRepost={() => {}} onDuet={(v) => { setCreationContext({type: 'duet', video: v}); setActiveTab('upload'); setActiveSheet('none'); }} onStitch={(v) => { setCreationContext({type: 'stitch', video: v}); setActiveTab('upload'); setActiveSheet('none'); }} onNotInterested={() => markNotInterested(sheetData)} isOwner={sheetData?.user?.id === currentUser.id} onSendToUser={(u) => { backend.messaging.sendMessage(currentUser.id, u.id, `Shared a video`); setActiveSheet('none'); }} />}
              {activeSheet === 'gift' && <GiftPicker userCoins={currentUser.coins} onSendGift={(g) => { backend.wallet.purchaseCoins(currentUser.id, -g.price, `Gifted ${g.name}`); setCurrentUser({...currentUser, coins: currentUser.coins - g.price}); setActiveSheet('none'); }} onClose={() => setActiveSheet('none')} onRecharge={() => setActiveSheet('wallet')} />}
              {activeSheet === 'wallet' && <Wallet currentBalance={currentUser.coins} onClose={() => setActiveSheet('none')} onBuy={(a) => { backend.wallet.purchaseCoins(currentUser.id, a, 'Coin Purchase'); setCurrentUser({...currentUser, coins: currentUser.coins + a}); }} />}
              {activeSheet === 'location' && <LocationExplorer locationName={sheetData} onClose={() => setActiveSheet('none')} />}
              {activeChatSessionId && (
                  <ChatWindow 
                    currentUser={currentUser} 
                    session={chatSessions.find(s => s.id === activeChatSessionId) || { id: activeChatSessionId, user: MOCK_USERS[0], messages: [], lastMessage: '', lastMessageTime: '', unreadCount: 0 }} 
                    onSendMessage={(t) => { backend.messaging.sendMessage(currentUser.id, activeChatSessionId.replace('new_', ''), t); }} 
                    onBack={() => setActiveChatSessionId(null)} 
                    onCall={() => {}} 
                  />
              )}
              {showAuthModal && <Auth onLogin={(u) => { if(u) { setCurrentUser(u); setIsLoggedIn(true); syncUserState(u.id); if(editingDraft) { handleUpload(editingDraft); setEditingDraft(null); } } setShowAuthModal(false); }} onClose={() => setShowAuthModal(false)} initialMode={authMode} onShowNotification={setActiveToast} />}
              {showQAModal && <QAModal currentUser={currentUser} onClose={() => setShowQAModal(false)} onAsk={() => {}} />}
              {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} onScanSuccess={(u) => { pushPage({name: 'user-profile', user: u}); setShowQRScanner(false); }} />}
              {activeToast && <Toast message={activeToast} onClose={() => setActiveToast(null)} onView={() => {}} />}
          </main>
        </div>
    </ErrorBoundary>
  );
};