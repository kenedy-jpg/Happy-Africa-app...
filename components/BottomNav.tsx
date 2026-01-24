
import React from 'react';
import { Home, Compass, MessageSquare, User, Plus } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isTransparent?: boolean;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, isTransparent = false, unreadCount = 0 }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'upload', icon: Plus, label: '', isPrimary: true },
    { id: 'inbox', icon: MessageSquare, label: 'Inbox', badge: unreadCount },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div 
      className={`absolute bottom-0 left-0 w-full flex items-center justify-between px-2 z-50 text-[10px] font-bold pt-2 pb-2 pb-safe transition-all duration-300 border-l border-r border-b ${
        isTransparent 
          ? 'bg-gradient-to-t from-black/95 via-black/60 to-transparent border-transparent text-white' 
          : 'bg-brand-indigo border-white/5 text-gray-400'
      }`}
    >
      {navItems.map((item) => {
        if (item.isPrimary) {
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as Tab)}
              className="w-[20%] flex items-center justify-center transform transition-transform active:scale-90 group"
            >
              <div className="relative w-[56px] h-[56px] flex items-center justify-center transition-transform group-hover:scale-110">
                {/* Gold halo */}
                <div className="absolute inset-0 rounded-full bg-brand-gold shadow-[0_0_20px_rgba(255,215,0,0.45)]"></div>

                {/* Inner surface */}
                <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center shadow-[0_0_12px_rgba(0,0,0,0.25)]">
                  <Plus className="text-brand-indigo" size={24} strokeWidth={4} />
                </div>
              </div>
            </button>
          );
        }

        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as Tab)}
            className="w-[20%] flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group"
          >
            <div
              className={`relative w-[48px] h-[48px] rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                isActive
                  ? 'bg-brand-gold border-brand-gold shadow-[0_0_14px_rgba(255,215,0,0.6)]'
                  : 'border-brand-gold/80 bg-black/25 group-hover:border-brand-gold group-hover:shadow-[0_0_12px_rgba(255,215,0,0.35)]'
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 3 : 2.4}
                className={isActive ? 'text-brand-indigo' : 'text-white/90 group-hover:text-brand-gold'}
              />

              {item.id === 'inbox' && item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1.5 bg-brand-pink text-white text-[9px] font-black px-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-brand-indigo">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </div>
            <span
              className={`text-[10px] tracking-wide transition-colors ${
                isActive ? 'font-black text-brand-gold' : isTransparent ? 'text-white/80' : 'text-gray-300'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
