import React from 'react';
import { Gift, Coins } from 'lucide-react';

interface GiftItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

const GIFTS: GiftItem[] = [
  { id: 'rose', name: 'Rose', price: 1, emoji: '🌹' },
  { id: 'tiktok', name: 'Thumbs Up', price: 5, emoji: '👍' },
  { id: 'heart', name: 'Finger Heart', price: 5, emoji: '🫰' },
  { id: 'confetti', name: 'Confetti', price: 10, emoji: '🎉' },
  { id: 'panda', name: 'Panda', price: 10, emoji: '🐼' },
  { id: 'love', name: 'Love You', price: 50, emoji: '🥰' },
  { id: 'crown', name: 'Crown', price: 99, emoji: '👑' },
  { id: 'rocket', name: 'To The Moon', price: 299, emoji: '🚀' },
  { id: 'lion', name: 'Lion', price: 29999, emoji: '🦁' },
];

interface GiftPickerProps {
  userCoins: number;
  onSendGift: (gift: GiftItem) => void;
  onClose: () => void;
  onRecharge: () => void;
}

export const GiftPicker: React.FC<GiftPickerProps> = ({ userCoins, onSendGift, onClose, onRecharge }) => {
  return (
    <div className="absolute inset-0 z-[60]" onClick={onClose}>
      <div 
        className="absolute bottom-0 w-full bg-brand-dark rounded-t-xl text-white animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header: Balance and Recharge */}
        <div className="flex justify-between items-center p-3 px-4 border-b border-white/10">
           <div className="flex items-center gap-1.5">
             <div className="w-4 h-4 rounded-full bg-brand-gold border border-brand-gold flex items-center justify-center text-[10px] text-black font-bold">$</div>
             <span className="font-bold text-sm">{userCoins}</span>
             <span className="text-xs text-gray-400">Balance</span>
           </div>
           <button 
             onClick={onRecharge}
             className="bg-brand-pink text-white px-3 py-1.5 rounded-full text-xs font-bold hover:brightness-110"
           >
             Recharge
           </button>
        </div>

        {/* Gift Grid */}
        <div className="h-64 overflow-y-auto grid grid-cols-4 gap-2 p-2 no-scrollbar">
           {GIFTS.map(gift => (
             <button 
               key={gift.id}
               onClick={() => onSendGift(gift)}
               disabled={userCoins < gift.price}
               className="flex flex-col items-center justify-center p-2 rounded hover:bg-white/5 active:scale-95 disabled:opacity-30 transition-all relative group"
             >
                <div className="text-4xl mb-2 filter drop-shadow-lg transition-transform group-hover:scale-110">{gift.emoji}</div>
                <div className="text-[11px] font-bold text-gray-200">{gift.name}</div>
                <div className="flex items-center gap-1 mt-1">
                   <div className="w-3 h-3 rounded-full bg-brand-gold flex items-center justify-center text-[8px] text-black font-bold">$</div>
                   <span className="text-[10px] text-brand-gold font-bold">{gift.price}</span>
                </div>
             </button>
           ))}
        </div>

        {/* Send Bar */}
        <div className="flex justify-between items-center p-3 bg-brand-dark border-t border-white/10 pb-safe">
           <div className="text-xs text-gray-500 font-medium">Send a gift to support the creator</div>
           <button className="text-brand-pink font-bold text-sm">Send</button>
        </div>
      </div>
    </div>
  );
};