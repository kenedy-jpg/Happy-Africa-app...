
import React, { useState, useEffect } from 'react';
import { X, ScanLine, Zap, Image as ImageIcon } from 'lucide-react';
import { backend } from '../services/backend';
import { User } from '../types';

interface QRScannerProps {
  onClose: () => void;
  onScanSuccess: (user: User) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScanSuccess }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [flashlight, setFlashlight] = useState(false);

  // Mock Scanning Logic
  useEffect(() => {
      if (isScanning) {
          const timer = setTimeout(async () => {
              // Simulate finding a user after 3 seconds
              setIsScanning(false);
              
              // Mock finding a random user
              try {
                  const users = await backend.user.searchUsers("a"); // Grab someone
                  if (users.length > 0) {
                      onScanSuccess(users[0]);
                  }
              } catch (e) {
                  console.error(e);
                  onClose();
              }
          }, 3000);
          return () => clearTimeout(timer);
      }
  }, [isScanning]);

  return (
    <div className="absolute inset-0 z-[70] bg-black flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-4 pt-safe absolute top-0 w-full z-20">
            <button onClick={onClose} className="w-10 h-10 bg-black/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                <X className="text-white" />
            </button>
            <h2 className="text-white font-bold text-sm shadow-black drop-shadow-md">Scan TikCode</h2>
            <button 
                onClick={() => setFlashlight(!flashlight)}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm ${flashlight ? 'bg-white text-black' : 'bg-black/30 text-white'}`}
            >
                <Zap size={20} className={flashlight ? "fill-black" : ""} />
            </button>
        </div>

        {/* Camera View */}
        <div className="flex-1 relative overflow-hidden bg-gray-900">
            {/* Mock Camera Feed */}
            <div className="absolute inset-0 opacity-50 bg-[url('https://picsum.photos/800/1200?grayscale')] bg-cover bg-center"></div>
            
            {/* Scan Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-brand-pink rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-brand-pink rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-brand-pink rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-brand-pink rounded-br-xl"></div>
                    
                    {/* Scanning Beam */}
                    {isScanning && (
                        <div className="absolute left-0 w-full h-1 bg-brand-pink/80 shadow-[0_0_15px_rgba(255,79,154,0.8)] animate-slide-down" style={{animationDuration: '2s', animationIterationCount: 'infinite'}}></div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-20 w-full text-center text-white/80 text-sm font-medium">
                Align code within frame to scan
            </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-black p-6 pb-safe flex justify-center">
            <button className="flex flex-col items-center gap-2 opacity-80 hover:opacity-100">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border border-white/20">
                    <ImageIcon className="text-white" size={24} />
                </div>
                <span className="text-xs text-white">Album</span>
            </button>
        </div>
    </div>
  );
};
