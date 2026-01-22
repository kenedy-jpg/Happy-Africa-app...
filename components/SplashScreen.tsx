
import React from 'react';
import { BrandLogo } from './BrandLogo';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] bg-brand-indigo flex flex-col items-center justify-center animate-fade-out" style={{ animationDelay: '5.5s', animationFillMode: 'forwards', pointerEvents: 'none' }}>
      
      {/* Made in Africa tagline */}
      <div className="text-center mb-16 animate-slide-down">
          <p className="text-brand-gold font-black text-2xl uppercase tracking-[0.25em] drop-shadow-lg">
              Made in Africa
          </p>
          <p className="text-white/90 font-bold text-lg uppercase tracking-[0.2em] mt-1">
              Made for the World
          </p>
      </div>

      <BrandLogo size="xl" className="mb-6 animate-pulse-slow" />

      {/* African Map - Gold */}
      <div className="mb-10 animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
        <svg 
          width="120" 
          height="120" 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-lg"
        >
          <path 
            d="M100 20C95 22 92 25 90 30L88 35L85 38C82 40 80 43 78 47L75 52L72 55C70 58 68 62 67 67L65 73L62 77C60 80 58 84 57 89L55 95L53 100C52 105 51 110 51 115C51 120 52 125 54 130L57 138L60 145C62 150 65 155 69 159L73 165L78 170C82 174 87 178 93 181L100 185L107 181C113 178 118 174 122 170L127 165L131 159C135 155 138 150 140 145L143 138L146 130C148 125 149 120 149 115C149 110 148 105 147 100L145 95L143 89C142 84 140 80 138 77L135 73L133 67C132 62 130 58 128 55L125 52L122 47C120 43 118 40 115 38L112 35L110 30C108 25 105 22 100 20Z M105 45L108 48L110 52L112 57L114 62L115 67L117 73L118 79L119 85L120 92L120 100L119 108L118 115L117 122L115 128L113 134L111 139L108 144L105 148L101 151L95 153L89 151L85 148L82 144L79 139L77 134L75 128L73 122L72 115L71 108L71 100L72 92L73 85L74 79L76 73L78 67L79 62L81 57L83 52L85 48L88 45L92 43L96 42L100 42L104 43L105 45Z" 
            fill="#FFD700"
            className="animate-pulse-glow"
          />
          {/* Inner detail */}
          <path 
            d="M100 60C98 61 96 63 95 65L93 68L91 72L89 77L88 82L87 88L86 95L86 100L87 105L88 110L89 115L91 120L93 124L95 128L98 131L102 133L106 133L110 131L113 128L115 124L117 120L119 115L120 110L121 105L121 100L120 95L119 88L118 82L117 77L115 72L113 68L111 65C109 63 107 61 105 60L100 58L100 60Z" 
            fill="#FFA500"
            opacity="0.6"
          />
        </svg>
      </div>

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
