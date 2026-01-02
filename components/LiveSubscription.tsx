
import React from 'react';
import { X, Star, Check, Shield, MessageCircle } from 'lucide-react';
import { User } from '../types';

interface LiveSubscriptionProps {
  host: User;
  onClose: () => void;
  onSubscribe: () => void;
}

export const LiveSubscription: React.FC<LiveSubscriptionProps> = ({ host, onClose, onSubscribe }) => {
  const perks = [
      { icon: Star, label: 'Subscriber Badges', desc: 'Stand out in comments with a custom badge.' },
      { icon: MessageCircle, label: 'Custom Emotes', desc: 'Access exclusive emotes designed by the host.' },
      { icon: Shield, label: 'Subscriber-Only Chat', desc: 'Participate in exclusive sub-only chat modes.' },
  ];

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={onClose}>
        <div className="bg-brand-dark w-full rounded-t-2xl overflow-hidden flex flex-col animate-slide-up border-t border-brand-pink/30" onClick={e => e.stopPropagation()}>
            {/* Header with gradient background */}
            <div className="h-32 bg-gradient-to-br from-brand-pink to-brand-orange relative p-4 flex flex-col items-center justify-center">
                <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 rounded-full p-1 text-white hover:bg-black/40"><X size={20} /></button>
                <div className="w-16 h-16 rounded-full border-4 border-brand-dark p-0.5 bg-white mb-2">
                    <img src={host.avatarUrl} className="w-full h-full rounded-full object-cover" />
                </div>
                <h3 className="text-white font-bold text-lg shadow-black drop-shadow-md">Subscribe to {host.displayName}</h3>
            </div>

            <div className="p-6 bg-brand-dark">
                <div className="flex flex-col gap-4 mb-6">
                    {perks.map((perk, i) => (
                        <div key={i} className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-brand-gold">
                                <perk.icon size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{perk.label}</h4>
                                <p className="text-gray-400 text-xs">{perk.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 flex justify-between items-center">
                    <div>
                        <span className="text-xs text-gray-400">Monthly Price</span>
                        <p className="text-xl font-bold text-white">$2.99 <span className="text-xs font-normal text-gray-500">/ month</span></p>
                    </div>
                    <div className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-1 rounded">Cancel Anytime</div>
                </div>

                <button 
                    onClick={onSubscribe}
                    className="w-full bg-gradient-to-r from-brand-pink to-brand-orange text-white font-bold py-3.5 rounded-full shadow-lg shadow-brand-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    Subscribe
                </button>
                <p className="text-center text-[10px] text-gray-500 mt-3">Recurring billing. Cancel via Google Play / App Store.</p>
            </div>
        </div>
    </div>
  );
};
