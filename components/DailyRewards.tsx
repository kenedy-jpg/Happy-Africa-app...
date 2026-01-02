import React, { useState, useEffect } from 'react';
import { X, Coins, Check, Gift } from 'lucide-react';
import { backend } from '../services/backend';
import { User } from '../types';

interface DailyRewardsProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
}

const REWARDS = [
    { day: 1, amount: 10 },
    { day: 2, amount: 20 },
    { day: 3, amount: 40 },
    { day: 4, amount: 50 },
    { day: 5, amount: 70 },
    { day: 6, amount: 80 },
    { day: 7, amount: 150, isBig: true },
];

export const DailyRewards: React.FC<DailyRewardsProps> = ({ currentUser, onClose, onUpdateUser }) => {
  const [currentDay, setCurrentDay] = useState(1);
  const [canClaim, setCanClaim] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
      checkStatus();
  }, []);

  const checkStatus = () => {
      const lastClaimDate = localStorage.getItem(`daily_claim_date_${currentUser.id}`);
      const streakDay = parseInt(localStorage.getItem(`daily_streak_${currentUser.id}`) || '0');
      
      const today = new Date().toDateString();

      if (lastClaimDate === today) {
          // Already claimed today
          setCanClaim(false);
          setCurrentDay(streakDay); // Show current progress
      } else {
          // New day
          // Check if streak is broken (missed yesterday)
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastClaimDate === yesterday.toDateString()) {
              setCurrentDay(Math.min(streakDay + 1, 7));
          } else {
              // Streak broken or first time
              setCurrentDay(1);
          }
          setCanClaim(true);
      }
  };

  const handleClaim = async () => {
      setIsClaiming(true);
      
      const reward = REWARDS[currentDay - 1].amount;
      
      // Update Backend
      await backend.wallet.purchaseCoins(currentUser.id, reward, 'Daily Reward'); // Re-using purchase logic to add coins
      
      // Update Local State
      const today = new Date().toDateString();
      localStorage.setItem(`daily_claim_date_${currentUser.id}`, today);
      localStorage.setItem(`daily_streak_${currentUser.id}`, currentDay.toString());
      
      // Optimistic update for UI
      const updatedUser = { ...currentUser, coins: currentUser.coins + reward };
      onUpdateUser(updatedUser);
      
      setCanClaim(false);
      setIsClaiming(false);
      
      // Close after delay
      setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-brand-dark w-full max-w-sm rounded-3xl p-6 relative border-2 border-brand-gold/30 shadow-[0_0_50px_rgba(255,215,0,0.2)] animate-slide-up overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-32 bg-brand-gold/20 blur-3xl rounded-full pointer-events-none"></div>

            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={24} />
            </button>

            <div className="text-center mb-6 relative z-10">
                <h2 className="text-2xl font-black text-white mb-1">Daily Check-in</h2>
                <p className="text-brand-gold text-sm font-bold">Get coins every day!</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
                {REWARDS.map((item) => {
                    const isCompleted = item.day < currentDay || (!canClaim && item.day === currentDay);
                    const isActive = canClaim && item.day === currentDay;
                    const isFuture = item.day > currentDay;

                    return (
                        <div 
                           key={item.day}
                           className={`relative rounded-xl p-2 flex flex-col items-center justify-center gap-1 border-2 ${
                               item.isBig ? 'col-span-2 aspect-auto' : 'aspect-square'
                           } ${
                               isActive 
                               ? 'bg-brand-gold/20 border-brand-gold' 
                               : isCompleted 
                                 ? 'bg-brand-pink/20 border-brand-pink'
                                 : 'bg-white/5 border-transparent'
                           }`}
                        >
                            <span className="text-[10px] text-gray-400">Day {item.day}</span>
                            
                            {isCompleted ? (
                                <div className="w-8 h-8 bg-brand-pink rounded-full flex items-center justify-center">
                                    <Check size={16} className="text-white" />
                                </div>
                            ) : item.isBig ? (
                                <Gift size={32} className={isActive ? 'text-brand-gold animate-bounce' : 'text-gray-600'} />
                            ) : (
                                <Coins size={20} className={isActive ? 'text-brand-gold animate-pulse' : 'text-gray-600'} />
                            )}

                            <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                +{item.amount}
                            </span>
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={handleClaim}
                disabled={!canClaim || isClaiming}
                className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                    canClaim 
                    ? 'bg-gradient-to-r from-brand-gold to-orange-500 text-white hover:scale-105 active:scale-95' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
            >
                {isClaiming ? 'Claiming...' : canClaim ? 'Check in Now' : 'Come back tomorrow'}
            </button>
        </div>
    </div>
  );
};