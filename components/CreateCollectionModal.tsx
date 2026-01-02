
import React, { useState } from 'react';
import { X, Lock, Globe } from 'lucide-react';

interface CreateCollectionModalProps {
  onClose: () => void;
  onCreate: (name: string, isPrivate: boolean) => void;
}

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = () => {
      if (name.trim()) {
          onCreate(name, isPrivate);
      }
  };

  return (
    <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in p-6">
        <div className="bg-brand-dark w-full max-w-sm rounded-xl p-6 border border-white/10 animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-lg">New Collection</h3>
                <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Name</label>
                    <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dance Moves"
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-brand-pink transition-colors"
                        maxLength={30}
                        autoFocus
                    />
                    <div className="text-right text-[10px] text-gray-500 mt-1">{name.length}/30</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                        {isPrivate ? <Lock size={18} className="text-brand-pink" /> : <Globe size={18} className="text-gray-400" />}
                        <div>
                            <p className="text-sm font-bold text-white">{isPrivate ? 'Private' : 'Public'}</p>
                            <p className="text-[10px] text-gray-400">
                                {isPrivate ? 'Only you can see this collection' : 'Anyone can see this collection'}
                            </p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${isPrivate ? 'bg-brand-pink' : 'bg-gray-600'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isPrivate ? 'left-5.5' : 'left-0.5'}`}></div>
                    </div>
                </div>

                <button 
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className="w-full bg-brand-pink text-white font-bold py-3 rounded-lg disabled:opacity-50 mt-4 shadow-lg shadow-brand-pink/20"
                >
                    Create Collection
                </button>
            </div>
        </div>
    </div>
  );
};
