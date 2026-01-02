
import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  className?: string;
  alt?: string;
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ src, className, alt, fallbackSrc, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Simulate WebP upgrade if supported (In a real app, this would modify the URL for an image CDN)
  const finalSrc = src;

  return (
    <div className={`relative overflow-hidden bg-white/5 ${className}`}>
      {/* Skeleton / Blur Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse" />
      )}
      
      {/* Fallback Icon */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-600">
            <ImageIcon size={20} />
        </div>
      )}

      <img
        src={hasError ? (fallbackSrc || "https://via.placeholder.com/150") : finalSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </div>
  );
};
