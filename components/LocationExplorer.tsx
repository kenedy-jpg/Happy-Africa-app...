
import React, { useState, useEffect } from 'react';
import { X, MapPin, Sparkles, Navigation, Link, Loader } from 'lucide-react';
import { exploreLocation, AIResponse } from '../services/geminiService';

interface LocationExplorerProps {
  locationName: string;
  onClose: () => void;
}

export const LocationExplorer: React.FC<LocationExplorerProps> = ({ locationName, onClose }) => {
  const [data, setData] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      const fetchData = async () => {
          setIsLoading(true);
          try {
              // Try to get high-accuracy location for grounding
              let coords;
              if (navigator.geolocation) {
                  try {
                      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
                      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                  } catch (e) { console.warn("Geolocation denied or timed out"); }
              }
              
              const result = await exploreLocation(locationName, coords);
              setData(result);
          } catch (e) {
              console.error(e);
          } finally {
              setIsLoading(false);
          }
      };
      fetchData();
  }, [locationName]);

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={onClose}>
        <div 
            className="bg-brand-dark w-full h-[70%] rounded-t-2xl flex flex-col animate-slide-up shadow-2xl border-t border-brand-pink/20"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-indigo/90 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-pink p-2 rounded-full">
                        <MapPin size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">{locationName}</h3>
                        <p className="text-xs text-brand-gold flex items-center gap-1"><Sparkles size={10} /> AI Insights</p>
                    </div>
                </div>
                <button onClick={onClose} className="bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors">
                    <X size={20} className="text-white" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 text-white">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                            <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" size={24} />
                        </div>
                        <p className="animate-pulse">Exploring {locationName}...</p>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* AI Text Content */}
                        <div className="prose prose-invert prose-sm max-w-none">
                            <p className="whitespace-pre-line leading-relaxed text-gray-200">
                                {data?.text}
                            </p>
                        </div>

                        {/* Grounding Sources (Maps/Search) */}
                        {data?.sources && data.sources.length > 0 && (
                            <div className="mt-8 pt-4 border-t border-white/10">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Sources & Links</h4>
                                <div className="flex flex-col gap-2">
                                    {data.sources.map((source, i) => (
                                        <a 
                                            key={i} 
                                            href={source.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors border border-white/5"
                                        >
                                            <div className="bg-blue-500/20 p-2 rounded text-blue-400">
                                                <Link size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{source.title}</p>
                                                <p className="text-xs text-gray-500 truncate">{source.url}</p>
                                            </div>
                                            <Navigation size={16} className="text-gray-400" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-8 flex justify-center">
                            <button className="bg-white text-black font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg">
                                <Navigation size={18} /> Get Directions
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
