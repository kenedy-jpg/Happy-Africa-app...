
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Settings, Eye, Loader, Lock } from 'lucide-react';
import { User } from '../types';
import { backend } from '../services/backend';

interface ProfileViewsProps {
  onBack: () => void;
}

export const ProfileViews: React.FC<ProfileViewsProps> = ({ onBack }) => {
  const [viewers, setViewers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
      const fetchViews = async () => {
          setIsLoading(true);
          const user = await backend.auth.getCurrentUserAsync();
          setCurrentUser(user);
          
          if (user) {
              if (user.profileViewsEnabled === false) {
                  setIsEnabled(false);
                  setIsLoading(false);
                  return;
              }

              try {
                  const data = await backend.user.getProfileViews(user.id);
                  setViewers(data);
              } catch (e) {
                  console.error(e);
              }
          }
          setIsLoading(false);
      };
      fetchViews();
  }, []);

  const handleTurnOn = async () => {
      if (currentUser) {
          setIsLoading(true);
          await backend.user.updateProfile({ ...currentUser, profileViewsEnabled: true });
          setIsEnabled(true);
          // Refetch
          const data = await backend.user.getProfileViews(currentUser.id);
          setViewers(data);
          setIsLoading(false);
      }
  };

  return (
    <div className="absolute inset-0 z-[50] bg-brand-indigo flex flex-col animate-slide-right">
      <div className="flex justify-between items-center p-4 pt-safe border-b border-white/10">
        <button onClick={onBack}><ChevronLeft className="text-white" /></button>
        <h2 className="font-bold text-white text-md">Profile views</h2>
        <button><Settings className="text-white" size={20} /></button>
      </div>
      
      {!isEnabled ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                  <Eye size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Turn on profile view history</h3>
              <p className="text-gray-400 text-sm mb-8">
                  See who viewed your profile in the past 30 days. Only you can see this. You can turn this off at any time.
              </p>
              <button 
                onClick={handleTurnOn}
                className="w-full bg-brand-pink text-white font-bold py-3 rounded-full"
              >
                  Turn on
              </button>
          </div>
      ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-start gap-3 mb-6 bg-white/5 p-4 rounded-lg">
                <Eye className="text-brand-pink mt-1" size={20} />
                <div>
                    <p className="text-white font-bold text-sm">Profile View History</p>
                    <p className="text-gray-400 text-xs mt-1">Users who viewed your profile in the past 30 days will appear here. Only you can see this.</p>
                </div>
                <div className="w-10 h-5 bg-brand-pink rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                </div>
            </div>

            <h3 className="text-white text-sm font-bold mb-4">Past 30 Days</h3>
            
            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader className="animate-spin text-brand-pink" />
                </div>
            ) : viewers.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-10">
                    No recent profile views.
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {viewers.map((u, i) => (
                        <div key={`${u.id}-${i}`} className="flex items-center justify-between group active:opacity-70">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <img src={u.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                                    {i < 1 && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-brand-indigo"></div>}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{u.displayName}</p>
                                    <p className="text-gray-400 text-xs">Viewed your profile</p>
                                </div>
                            </div>
                            <button className="bg-brand-gold text-black px-4 py-1.5 rounded-sm text-xs font-bold hover:bg-brand-gold/90">Follow</button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-xs">That's all for now.</p>
            </div>
          </div>
      )}
    </div>
  );
};
