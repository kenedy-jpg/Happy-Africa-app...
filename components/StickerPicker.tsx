
import React, { useState } from 'react';
import { X, Sparkles, Smile, Search, Loader } from 'lucide-react';
import { generateAISticker } from '../services/geminiService';

interface StickerPickerProps {
  onSelect: (stickerContent: string, type: 'sticker' | 'image') => void;
  onClose: () => void;
}

const EMOJIS = [
  '😂', '🔥', '❤️', '😍', '😎', '🎉', '💩', '👀', '🌍', '🦁',
  '🙌', '✨', '🎵', '💃', '🕺', '🦄', '🍕', '🌮', '🍩', '🍺',
  '🚀', '💯', '💢', '💤', '💥', '💦', '🍆', '🍑', '🥑', '🥥'
];

export const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'ai'>('emoji');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSticker, setGeneratedSticker] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGeneratedSticker(null);
    const result = await generateAISticker(aiPrompt);
    setGeneratedSticker(result);
    setIsGenerating(false);
  };

  return (
    <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fade-in" onClick={onClose}>
      <div 
        className="w-full bg-brand-dark rounded-t-xl overflow-hidden h-[50%] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            onClick={() => setActiveTab('emoji')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'emoji' ? 'text-white border-b-2 border-brand-pink' : 'text-gray-500'}`}
          >
            <Smile size={16} /> Emojis
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-brand-gold border-b-2 border-brand-gold' : 'text-gray-500'}`}
          >
            <Sparkles size={16} /> AI Gen
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
          {activeTab === 'emoji' && (
            <div className="grid grid-cols-6 gap-4">
              {EMOJIS.map((emoji, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onSelect(emoji, 'sticker')}
                  className="text-3xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe sticker (e.g. 'Neon Cat')"
                  className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-white outline-none border border-white/10 focus:border-brand-gold"
                />
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !aiPrompt}
                  className="bg-brand-gold text-black font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={18} className="animate-spin" /> : 'Go'}
                </button>
              </div>

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
                  <Sparkles className="animate-spin text-brand-gold" size={32} />
                  <span className="text-xs">Creating magic...</span>
                </div>
              )}

              {generatedSticker && (
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                  <p className="text-xs text-gray-400">Tap to add</p>
                  <img 
                    src={generatedSticker} 
                    className="w-32 h-32 object-contain cursor-pointer hover:scale-105 transition-transform" 
                    onClick={() => onSelect(generatedSticker!, 'image')}
                  />
                </div>
              )}
              
              {!generatedSticker && !isGenerating && (
                  <div className="text-center text-gray-600 text-xs mt-4">
                      Powered by Gemini AI. <br/> Try "Cyberpunk Africa Map" or "Golden Lion".
                  </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
