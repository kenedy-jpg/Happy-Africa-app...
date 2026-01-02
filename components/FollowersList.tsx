import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ChevronLeft, Search, Loader, UserPlus, Check, Wifi } from 'lucide-react';
import { backend } from '../services/backend';
import { formatNumber } from '../constants';

interface FollowersListProps {
  user: User;
  type: 'followers' | 'following';
  onBack: () => void;
  onNavigateProfile: (user: User) => void;
  followedUserIds: Set<string>;
  onToggleFollow: (userId: string) => void;
}

export const FollowersList: React.FC<FollowersListProps> = ({ 
    user, 
    type, 
    onBack, 
    onNavigateProfile,
    followedUserIds,
    onToggleFollow
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = type === 'followers' 
          ? await backend.user.getFollowers(user.id)
          : await backend.user.getFollowing(user.id);
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id, type]);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-[60] bg-brand-indigo flex flex-col animate-slide-right text-white">
      {/* Header */}
      <div className="flex items-center p-4 pt-safe border-b border-white/10 bg-brand-indigo sticky top-0 z-10">
        <button onClick={onBack} className="p-1 -ml-1 active:opacity-50"><ChevronLeft size={28} /></button>
        <div className="flex-1 text-center">
            <h2 className="font-black text-md uppercase tracking-tight">
                {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest">@{user.username}</p>
        </div>
        <div className="w-8"></div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-pink transition-colors"
              />
          </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader className="animate-spin text-brand-pink" size={32} />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">Syncing Tribe...</span>
              </div>
          ) : filteredUsers.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                  <p className="text-sm font-bold">No users found.</p>
              </div>
          ) : (
              <div className="flex flex-col gap-5">
                  {filteredUsers.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between group active:bg-white/5 p-2 -m-2 rounded-xl transition-colors"
                      >
                          <div 
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => onNavigateProfile(u)}
                          >
                              <div className="relative">
                                  <img 
                                    src={u.avatarUrl} 
                                    className={`w-14 h-14 rounded-full object-cover border-2 ${u.isLive ? 'border-brand-pink' : 'border-white/10'}`} 
                                  />
                                  {u.isLive && (
                                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-brand-pink text-[8px] font-black px-1.5 rounded-full border border-brand-indigo uppercase">
                                          Live
                                      </div>
                                  )}
                              </div>
                              <div className="min-w-0">
                                  <p className="text-sm font-black truncate">{u.displayName}</p>
                                  <p className="text-xs text-gray-500 font-bold truncate">@{u.username}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-gray-400">{formatNumber(u.followers)} Followers</span>
                                  </div>
                              </div>
                          </div>
                          
                          {u.id !== backend.auth.getCurrentUser()?.id && (
                              <button 
                                onClick={() => onToggleFollow(u.id)}
                                className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    followedUserIds.has(u.id)
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20'
                                }`}
                              >
                                  {followedUserIds.has(u.id) ? 'Following' : 'Follow'}
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};