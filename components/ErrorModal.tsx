import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ErrorModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ title, message, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Copy failed:', e);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Message */}
        <div className="p-6">
          <div className="bg-gray-800 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
            <p className="text-gray-200 text-sm whitespace-pre-wrap font-mono select-text">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-brand-pink text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Error
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-gray-700 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
