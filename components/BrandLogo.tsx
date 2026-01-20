
import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true, className = "" }) => {
  const containerSizes = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-16 h-16 rounded-2xl',
    lg: 'w-32 h-32 rounded-[2rem]',
    xl: 'w-44 h-44 rounded-[2.8rem]'
  };

  const iconSizes = {
    sm: 24,
    md: 40,
    lg: 80,
    xl: 110
  };

  const textSize = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* The Rounded Gradient Box */}
      <div className={`${containerSizes[size]} bg-gradient-to-b from-[#FF6B00] to-[#FFD700] flex items-center justify-center shadow-lg relative overflow-hidden`}>
        {/* SVG Musical Note with Africa Silhouette */}
        <svg 
          width={iconSizes[size]} 
          height={iconSizes[size]} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          {/* Note Stem and Flag */}
          <path 
            d="M45 15V70C45 78.2843 38.2843 85 30 85C21.7157 85 15 78.2843 15 70C15 61.7157 21.7157 55 30 55C33.5 55 36.5 56.2 39 58.2V15H85V35H55V15H45Z" 
            fill="black" 
          />
          {/* Africa Silhouette inside the Note Head */}
          <path 
            d="M30 62C27 62 25 63 24 65C23 67 23 69 24 71C25 73 27 75 30 76C33 77 36 76 37 74C38 72 38 69 37 67C36 65 33 62 30 62ZM30 64C32 64 33 65 34 66C35 68 35 70 34 72C33 73 31 74 29 74C27 74 25 73 24 71C23 69 23 67 24 66C25 65 27 64 30 64Z" 
            fill="#FF6B00"
            className="animate-pulse"
          />
          {/* Simplified Africa path for the specific head-area */}
          <path 
            d="M28 65C27.5 65.5 27.2 66.2 27.5 67C27.8 67.8 28.5 68.2 29 68.5C29.5 68.8 29.8 69.5 29.5 70.2C29.2 70.9 28.5 71.5 27.5 71.5C26.5 71.5 25.5 70.5 25 69.5C24.5 68.5 24.5 67.5 25 66.5C25.5 65.5 26.5 65 28 65Z" 
            fill="#FF6B00" 
          />
          {/* Main Africa Shape inside the circle head */}
          <path 
            d="M32 63.5C33.5 63.5 35 64 36 65C37 66 37.5 67.5 37 69C36.5 70.5 35.5 72 34 73C32.5 74 31 74.5 29.5 74C28 73.5 26.5 72.5 26 71C25.5 69.5 25.5 68 26.5 66.5C27.5 65 29.5 63.5 32 63.5Z" 
            fill="#FF9E80" 
          />
        </svg>
      </div>

      {/* Text Branding */}
      {showText && (
        <div className="flex flex-col items-center mt-1">
          <span className={`${textSize[size]} font-black text-brand-pink tracking-tight leading-none`}>HAPPY</span>
          <span className={`${textSize[size]} font-black text-brand-gold tracking-tight leading-none`}>AFRICA</span>
        </div>
      )}
    </div>
  );
};
