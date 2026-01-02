
import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User } from 'lucide-react';
import { User as UserType } from '../types';

interface CallOverlayProps {
  partner: UserType;
  isVideo: boolean;
  onEnd: () => void;
  isIncoming?: boolean;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({ partner, isVideo, onEnd, isIncoming = false }) => {
  const [status, setStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    let timer: number;
    if (status === 'connected') {
      timer = window.setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
      // Simulate connection logic
      if (status === 'calling') {
          const t = setTimeout(() => setStatus('connected'), 2500);
          return () => clearTimeout(t);
      }
  }, [status]);

  const handleAccept = () => setStatus('connected');

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-between py-12 pb-safe animate-fade-in">
        {/* Background / Video Feed */}
        <div className="absolute inset-0 z-0">
            {status === 'connected' && isVideo && !cameraOff ? (
                <img src="https://picsum.photos/800/1200?random=call" className="w-full h-full object-cover opacity-80" />
            ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                        <img src={partner.avatarUrl} className="w-full h-full object-cover" />
                    </div>
                </div>
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        </div>

        {/* Top Info */}
        <div className="relative z-10 flex flex-col items-center mt-12">
            <h2 className="text-3xl font-bold text-white mb-2">{partner.displayName}</h2>
            <p className="text-gray-300 text-sm animate-pulse">
                {status === 'incoming' ? 'Incoming Call...' : status === 'calling' ? 'Calling...' : formatTime(duration)}
            </p>
        </div>

        {/* Controls */}
        <div className="relative z-10 w-full px-12">
            {status === 'incoming' ? (
                <div className="flex justify-between items-center">
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={onEnd} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-90 transition-transform">
                            <PhoneOff className="text-white" size={32} />
                        </button>
                        <span className="text-white text-xs font-bold">Decline</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={handleAccept} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-90 transition-transform animate-bounce">
                            <Phone className="text-white" size={32} />
                        </button>
                        <span className="text-white text-xs font-bold">Accept</span>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    <div className="flex justify-center gap-8">
                        <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full backdrop-blur-md ${isMuted ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                            {isMuted ? <MicOff /> : <Mic />}
                        </button>
                        {isVideo && (
                            <button onClick={() => setCameraOff(!cameraOff)} className={`p-4 rounded-full backdrop-blur-md ${cameraOff ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                                {cameraOff ? <VideoOff /> : <Video />}
                            </button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button onClick={onEnd} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                            <PhoneOff className="text-white" size={32} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
