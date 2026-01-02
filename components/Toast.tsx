import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: {
    user: string;
    avatar: string;
    text: string;
    type: string;
  } | null;
  onClose: () => void;
  onView: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, onView }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div 
      className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}
    >
      <div className="bg-gray-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3">
         <img src={message.avatar} className="w-10 h-10 rounded-full border border-white/20" alt="avatar" />
         <div className="flex-1 overflow-hidden" onClick={onView}>
            <p className="text-sm font-bold truncate">{message.user}</p>
            <p className="text-xs text-gray-300 truncate">{message.text}</p>
         </div>
         <div className="flex items-center gap-2">
             <button 
               onClick={onView}
               className="bg-brand-pink text-white text-xs font-bold px-3 py-1.5 rounded-full"
             >
               View
             </button>
             <button onClick={() => setIsVisible(false)} className="text-gray-400">
               <X size={16} />
             </button>
         </div>
      </div>
    </div>
  );
};