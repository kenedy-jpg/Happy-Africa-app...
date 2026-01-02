
import React from 'react';
import { BrandLogo } from './BrandLogo';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-brand-indigo flex flex-col items-center justify-center animate-fade-out" style={{ animationDelay: '5.5s', animationFillMode: 'forwards', pointerEvents: 'none' }}>
      
      <BrandLogo size="xl" className="mb-10 animate-pulse-slow" />

      {/* Message & Progress */}
      <div className="text-center max-w-xs px-6 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <p className="text-white font-black text-sm uppercase tracking-[0.2em] mb-4 drop-shadow-md">
              Share your vibe.
          </p>
          <div className="w-32 h-1 bg-white/10 mx-auto rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-brand-pink to-brand-gold w-0 animate-marquee" style={{ animationDuration: '4.5s', animationIterationCount: 'infinite' }}></div>
          </div>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest opacity-80">
              Inspire the whole world
          </p>
      </div>

      <div className="absolute bottom-12 text-brand-gold/60 text-[9px] font-black tracking-[0.3em] uppercase animate-pulse">
         Curating Vibes...
      </div>
    </div>
  );
};
