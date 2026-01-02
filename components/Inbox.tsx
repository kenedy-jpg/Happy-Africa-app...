
import React, { useState, useEffect } from 'react';
import { Send, ChevronDown, Heart, MessageCircle, User as UserIcon, ArrowLeft, Search, Camera, X } from 'lucide-react';
import { User as UserType, ChatSession } from '../types';
import { backend } from '../services/backend';

interface InboxProps {
  notifications: any[];
  chatSessions: ChatSession[];
  onOpenChat: (user: UserType) => void;
}

type FilterType = 'All' | 'Likes' | 'Comments' | 'Mentions' | 'Followers';
type ViewType = 'activity' | 'messages';

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
};

const ActivityItem: React.FC<{ item: any }> = ({ item }) => (
    <div className={`flex items-center justify-between mb-5 active:opacity-70 transition-opacity cursor-pointer ${!item.is_read ? 'bg-white/5 p-2 -mx-2 rounded-lg' : ''}`}>
        <div className="flex items-center gap-3">
            <div className="relative">
                {/* Fallback avatar if actor is missing */}
                <img src={item.actor?.avatar_url || 'https://via.placeholder.com/50'} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-brand-indigo ${
                    item.type === 'like' ? 'bg-brand-pink' :
                    item.type === 'comment' ? 'bg-blue-500' :
                    item.type === 'follow' ? 'bg-brand-gold' : 'bg-gray-500'
                }`}>
                    {item.type === 'like' && <Heart size={10} className="fill-white text-white" />}
                    {item.type === 'comment' && <MessageCircle size={10} className="fill-white text-white" />}
                    {item.type === 'follow' && <UserIcon size={10} className="fill-white text-white" />}
                </div>
            </div>
            <div className="flex flex-col max-w-[180px]">
                <p className="text-sm text-white leading-tight">
                    <span className="font-bold">{item.actor?.username || 'Someone'}</span> <span className="text-gray-300">{item.text}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatRelativeTime(item.created_at)}</p>
            </div>
        </div>

        {/* Right Side Action */}
        {item.type === 'follow' ? (
            <button className="bg-brand-pink text-white text-xs font-semibold px-4 py-1.5 rounded-sm shadow-sm hover:brightness-105">
                Follow Back
            </button>
        ) : (
            <div className="w-10 h-14 rounded bg-gray-800 overflow-hidden border border-white/10">
                {/* If notification has a related video thumbnail, show it. Otherwise placeholder */}
                <img src={`https://picsum.photos/100/150?random=${item.id}`} className="w-full h-full object-cover opacity-80" />
            </div>
        )}
    </div>
);

const MessageItem: React.FC<{ session: ChatSession | null, user?: UserType, onOpen: () => void }> = ({ session, user, onOpen }) => {
    const displayUser = session ? session.user : user!;
    const lastMsg = session ? session.lastMessage : "Start a conversation";
    const time = session ? session.lastMessageTime : "";

    return (
        <div onClick={onOpen} className="flex items-center justify-between mb-5 active:bg-white/5 p-2 -mx-2 rounded-lg transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img src={displayUser.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-white/10" />
                    {session && session.unreadCount > 0 && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-brand-pink rounded-full border-2 border-brand-indigo"></div>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">{displayUser.displayName}</span>
                    <span className="text-gray-400 text-xs line-clamp-1">
                        {lastMsg} {time && `• ${time}`}
                    </span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Camera size={20} className="text-gray-500" />
            </div>
        </div>
    );
};

export const Inbox: React.FC<InboxProps> = ({ notifications, chatSessions, onOpenChat }) => {
  const [view, setView] = useState<ViewType>('activity');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search State
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mark as Read on Mount
  useEffect(() => {
      const markRead = async () => {
          const user = backend.auth.getCurrentUser();
          if (user) {
              await backend.notifications.markAsRead(user.id);
          }
      };
      markRead();
  }, []);

  // Filter Logic
  const filterNotification = (n: any) => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Likes' && n.type === 'like') return true;
      if (activeFilter === 'Comments' && n.type === 'comment') return true;
      if (activeFilter === 'Followers' && n.type === 'follow') return true;
      return false;
  };

  // Simplified categorization: Just show list for MVP, time sections can be complex with dynamic dates
  const filteredNotifications = notifications.filter(filterNotification);

  // Message Search Logic
  useEffect(() => {
      const doSearch = async () => {
          if (!searchQuery.trim()) {
              setSearchResults([]);
              return;
          }
          setIsSearching(true);
          try {
              const users = await backend.user.searchUsers(searchQuery);
              // Filter out users we already have sessions with
              const sessionUserIds = new Set(chatSessions.map(s => s.user.id));
              setSearchResults(users.filter(u => !sessionUserIds.has(u.id)));
          } catch (e) {
              console.error(e);
          } finally {
              setIsSearching(false);
          }
      };
      
      const debounce = setTimeout(doSearch, 500);
      return () => clearTimeout(debounce);
  }, [searchQuery, chatSessions]);

  const filteredSessions = chatSessions.filter(s => 
      s.user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'messages') {
      return (
        <div className="h-full bg-brand-indigo text-white overflow-hidden flex flex-col relative animate-slide-right">
             {/* Messages Header */}
             <div className="sticky top-0 bg-brand-indigo z-20 p-4 pt-safe flex items-center justify-between border-b border-white/10 shrink-0">
                 <button onClick={() => setView('activity')} className="p-1">
                     <ArrowLeft size={24} />
                 </button>
                 <h1 className="font-bold text-lg">Direct Messages</h1>
                 <button className="p-1">
                     <Send size={24} className="text-white" />
                 </button>
             </div>

             {/* Search */}
             <div className="px-4 py-2">
                 <div className="bg-white/10 rounded-lg flex items-center px-3 py-2 gap-2">
                     <Search size={16} className="text-gray-400" />
                     <input 
                        placeholder="Search" 
                        className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                     {searchQuery && (
                         <button onClick={() => setSearchQuery('')}>
                             <X size={14} className="text-gray-400" />
                         </button>
                     )}
                 </div>
             </div>

             {/* Message List */}
             <div className="flex-1 overflow-y-auto p-4 pb-24">
                 <div className="flex flex-col gap-1">
                     {/* Existing Sessions */}
                     {filteredSessions.map(session => (
                         <MessageItem key={session.id} session={session} onOpen={() => onOpenChat(session.user)} />
                     ))}
                     
                     {/* Search Results */}
                     {searchQuery && searchResults.map(user => (
                         <MessageItem key={user.id} session={null} user={user} onOpen={() => onOpenChat(user)} />
                     ))}

                     {filteredSessions.length === 0 && (!searchQuery || (searchResults.length === 0 && !isSearching)) && (
                         <div className="text-center text-gray-500 mt-10 text-sm">
                             {isSearching ? 'Searching...' : 'No messages found.'}
                         </div>
                     )}
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="h-full bg-brand-indigo text-white overflow-hidden flex flex-col relative animate-fade-in">
        {/* Activity Header */}
        <div className="sticky top-0 bg-brand-indigo z-20 p-4 pt-safe flex items-center justify-center border-b border-white/10 shrink-0">
             <div 
               className="flex items-center gap-1 font-bold text-lg cursor-pointer text-white relative"
               onClick={() => setShowFilterMenu(!showFilterMenu)}
             >
                 {activeFilter} Activity <ChevronDown size={16} className={`transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
             </div>
             <button 
                className="absolute right-4 text-white p-2 hover:bg-white/5 rounded-full" 
                onClick={() => setView('messages')}
             >
                 <Send size={24} className="-rotate-45" />
             </button>
        </div>

        {/* Filter Dropdown */}
        {showFilterMenu && (
            <div className="absolute top-[80px] left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg shadow-2xl z-30 w-48 border border-white/10 animate-fade-in overflow-hidden">
                {['All', 'Likes', 'Comments', 'Mentions', 'Followers'].map((f) => (
                    <button 
                        key={f} 
                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-white/5 ${activeFilter === f ? 'text-brand-pink' : 'text-white'}`}
                        onClick={() => { setActiveFilter(f as FilterType); setShowFilterMenu(false); }}
                    >
                        {f}
                    </button>
                ))}
            </div>
        )}

        {/* Activity List */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
            {filteredNotifications.length > 0 ? (
                <div className="flex flex-col gap-1">
                    {filteredNotifications.map(item => <ActivityItem key={item.id} item={item} />)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle size={32} />
                    </div>
                    <p className="text-sm font-medium">No notifications yet</p>
                </div>
            )}
        </div>
    </div>
  );
};
