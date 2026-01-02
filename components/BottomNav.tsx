
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
      className={`absolute bottom-0 left-0 w-full flex items-center justify-between px-2 z-50 text-[10px] font-bold pt-2 pb-2 pb-safe transition-all duration-300 border-t ${
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
                <div className="relative w-[48px] h-[32px] flex items-center justify-center transition-transform group-hover:scale-110">
                   {/* Brand Layered Effect */}
                   <div className="absolute left-0 top-0 w-full h-full bg-brand-gold rounded-lg transform -translate-x-[4px]"></div>
                   <div className="absolute right-0 top-0 w-full h-full bg-brand-pink rounded-lg transform translate-x-[4px]"></div>
                   
                   {/* Main Button Surface */}
                   <div className="absolute inset-0 w-full h-full bg-white rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                      <Plus className="text-brand-indigo" size={22} strokeWidth={4} />
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
            style={{
                color: isActive ? '#FFD700' : (isTransparent ? 'rgba(255,255,255,0.7)' : '#9CA3AF')
            }}
          >
            <div className="relative">
                <item.icon 
                  size={26} 
                  fill={isActive ? "currentColor" : "none"} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" : "group-hover:text-white transition-colors"}
                />
                {item.id === 'inbox' && item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1.5 bg-brand-pink text-white text-[9px] font-black px-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-brand-indigo">
                        {item.badge > 99 ? '99+' : item.badge}
                    </div>
                )}
            </div>
            <span className={`text-[10px] tracking-wide ${isActive ? 'font-black scale-105' : 'font-bold opacity-80'}`}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
