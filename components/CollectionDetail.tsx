
import React from 'react';
import { ChevronLeft, MoreHorizontal, Lock, Globe, Play } from 'lucide-react';
import { Collection, Video } from '../types';
import { formatNumber } from '../constants';

interface CollectionDetailProps {
  collection: Collection;
  onBack: () => void;
  onVideoClick?: (video: Video) => void;
}

export const CollectionDetail: React.FC<CollectionDetailProps> = ({ collection, onBack, onVideoClick }) => {
  const videos = collection.videos || [];

  return (
    <div className="absolute inset-0 z-[60] bg-brand-indigo flex flex-col animate-slide-right text-white">
        <div className="flex justify-between items-center p-4 pt-safe border-b border-white/10 sticky top-0 bg-brand-indigo/95 backdrop-blur-md z-10">
            <button onClick={onBack}><ChevronLeft size={24} /></button>
            <div className="flex flex-col items-center">
                <span className="font-bold text-sm">Collection</span>
            </div>
            <button><MoreHorizontal size={24} /></button>
        </div>

        <div className="p-6">
            <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 bg-gray-800 rounded-xl mb-4 overflow-hidden border border-white/10 flex items-center justify-center">
                    {collection.coverUrl ? (
                        <img src={collection.coverUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-4xl">📁</div>
                    )}
                </div>
                <h1 className="text-xl font-bold mb-1">{collection.name}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {collection.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                    <span>{collection.isPrivate ? 'Private' : 'Public'}</span>
                    <span>•</span>
                    <span>{collection.videoCount} videos</span>
                </div>
            </div>

            {videos.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                    This collection is empty. <br/> Add videos to it!
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-[1px]">
                    {videos.map((video, i) => (
                        <div 
                            key={i} 
                            className="aspect-[3/4] bg-brand-dark relative cursor-pointer"
                            onClick={() => onVideoClick && onVideoClick(video)}
                        >
                            <video src={video.url} className="w-full h-full object-cover opacity-80" muted />
                            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-[10px] text-white font-bold drop-shadow-md">
                                <Play size={10} fill="white" /> {formatNumber(video.likes)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
