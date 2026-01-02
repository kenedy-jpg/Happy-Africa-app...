
import React, { useState } from 'react';
import { X, Flag, Link, Copy, Repeat, MessageCircle, Send, Check, SplitSquareHorizontal, Scissors, ThumbsDown, Download, DownloadCloud, Trash2 } from 'lucide-react';
import { Video, User } from '../types';
import { MOCK_USERS } from '../constants';
import { backend } from '../services/backend';

interface ShareSheetProps {
  video?: Video;
  onClose: () => void;
  onRepost: () => void;
  onDuet: (video: Video) => void;
  onStitch: (video: Video) => void;
  onNotInterested: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
  onReport?: () => void;
  onSendToUser?: (user: User) => void; 
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ 
    video, 
    onClose, 
    onRepost, 
    onDuet, 
    onStitch, 
    onNotInterested,
    isOwner,
    onDelete,
    onReport,
    onSendToUser
}) => {
  const [hasReposted, setHasReposted] = useState(false);
  const [hasMarkedNotInterested, setHasMarkedNotInterested] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [sentUsers, setSentUsers] = useState<Set<string>>(new Set());
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Repost Input State
  const [showRepostInput, setShowRepostInput] = useState(false);
  const [repostThought, setRepostThought] = useState('');

  const handleRepostClick = () => {
      setShowRepostInput(true);
  };

  const handleConfirmRepost = () => {
      if (!video) return;
      backend.content.repostVideo(video.id, repostThought);
      setHasReposted(true);
      onRepost();
      setTimeout(onClose, 1500);
  };

  const handleNotInterestedClick = () => {
      setHasMarkedNotInterested(true);
      onNotInterested();
      setTimeout(onClose, 1500);
  };

  const handleSendTo = (user: User) => {
      if (sentUsers.has(user.id)) return;
      setSentUsers(prev => new Set(prev).add(user.id));
      if (onSendToUser) {
          onSendToUser(user);
      }
  };

  const handleSaveVideo = () => {
      setIsSaving(true);
      setSaveProgress(0);
      
      const interval = setInterval(() => {
          setSaveProgress(prev => {
              const next = prev + Math.floor(Math.random() * 15);
              if (next >= 100) {
                  clearInterval(interval);
                  setTimeout(() => {
                      setIsSaving(false);
                      onClose();
                  }, 500);
                  return 100;
              }
              return next;
          });
      }, 300);
  };

  const handleCopyLink = async () => {
      if (!video) return;
      const url = `${window.location.origin}/video/${video.id}`;
      try {
          await navigator.clipboard.writeText(url);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
      } catch (err) {
          console.error("Failed to copy", err);
      }
  };

  const handleNativeShare = async (platform?: string) => {
      if (!video) return;
      const url = `${window.location.origin}/video/${video.id}`;
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: video.description,
                  text: `Check out this video on Happy Africa!`,
                  url: url
              });
              onClose();
          } catch (err) {
              console.log("Share canceled", err);
          }
      } else {
          // Fallback if browser doesn't support native share
          handleCopyLink();
      }
  };

  const APPS = [
    {n: 'Repost', i: Repeat, c: 'bg-brand-pink', onClick: handleRepostClick },
    {n: 'Whatsapp', i: MessageCircle, c: 'bg-green-500', onClick: () => handleNativeShare('whatsapp') }, 
    {n: 'Instagram', i: Send, c: 'bg-brand-pink', onClick: () => handleNativeShare('instagram') }, 
    {n: 'Facebook', i: MessageCircle, c: 'bg-blue-600', onClick: () => handleNativeShare('facebook') }, 
    {n: 'SMS', i: MessageCircle, c: 'bg-green-400', onClick: () => handleNativeShare('sms') }, 
    {n: 'Email', i: Send, c: 'bg-blue-400', onClick: () => handleNativeShare('email') }
  ];

  const ACTIONS = [
    {n: 'Report', i: Flag, onClick: onReport, danger: true}, 
    {n: 'Not Interested', i: ThumbsDown, onClick: handleNotInterestedClick}, 
    {n: 'Save Video', i: Download, onClick: handleSaveVideo}, 
    {n: linkCopied ? 'Copied' : 'Copy Link', i: linkCopied ? Check : Link, onClick: handleCopyLink},
    {n: 'Duet', i: SplitSquareHorizontal, onClick: () => video && onDuet(video)},
    {n: 'Stitch', i: Scissors, onClick: () => video && onStitch(video)},
  ];

  // If owner, replace specific actions or prepend
  const ownerActions = [
      {n: 'Delete', i: Trash2, onClick: onDelete, danger: true},
      {n: 'Save Video', i: Download, onClick: handleSaveVideo},
      {n: linkCopied ? 'Copied' : 'Copy Link', i: linkCopied ? Check : Link, onClick: handleCopyLink},
      {n: 'Privacy Settings', i: Link}, // Mock
  ];

  const displayActions = isOwner ? ownerActions : ACTIONS;

  if (isSaving) {
      return (
          <div className="absolute inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-20 h-20 mb-4">
                  <svg className="w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="36" fill="none" stroke="#333" strokeWidth="6" />
                      <circle 
                        cx="50%" cy="50%" r="36" fill="none" stroke="#FF4F9A" strokeWidth="6" 
                        strokeDasharray="226" 
                        strokeDashoffset={226 - (226 * saveProgress) / 100} 
                        className="transition-all duration-300"
                      />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                      {saveProgress}%
                  </div>
              </div>
              <p className="text-white font-bold">Saving Video...</p>
              <p className="text-gray-400 text-xs mt-1">Do not close the app</p>
          </div>
      );
  }

  return (
    <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
        <div className="absolute bottom-0 w-full bg-brand-dark rounded-t-xl flex flex-col p-4 pb-safe animate-slide-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm text-center w-full">{showRepostInput ? 'Share your thoughts' : 'Share to'}</span>
            <button onClick={onClose} className="absolute right-4"><X size={16} className="text-gray-400" /></button>
        </div>

        {/* Repost Input Area */}
        {showRepostInput ? (
            <div className="flex flex-col gap-4 animate-fade-in">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-brand-pink flex items-center justify-center shrink-0">
                        <Repeat size={20} className="text-white" />
                    </div>
                    <textarea 
                        autoFocus
                        value={repostThought}
                        onChange={(e) => setRepostThought(e.target.value)}
                        placeholder="Add a thought..."
                        className="w-full bg-transparent text-white text-sm outline-none resize-none h-20 placeholder-gray-500"
                    />
                </div>
                <button 
                    onClick={handleConfirmRepost}
                    className="w-full bg-brand-pink text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    Repost
                </button>
            </div>
        ) : (
            <>
                {/* Send to Friends Row */}
                <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar border-b border-white/10 mb-4">
                    {MOCK_USERS.slice(0, 8).map(user => (
                        <div key={user.id} className="flex flex-col items-center gap-2 min-w-[60px] cursor-pointer group" onClick={() => handleSendTo(user)}>
                            <div className="relative">
                                <img 
                                src={user.avatarUrl} 
                                className={`w-12 h-12 rounded-full object-cover border-2 transition-all ${sentUsers.has(user.id) ? 'border-green-500 opacity-50' : 'border-white/10 group-hover:border-white'}`}
                                />
                                {sentUsers.has(user.id) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                        <Check size={20} className="text-green-500 font-bold" strokeWidth={3} />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-brand-pink rounded-full border-2 border-brand-dark"></div>
                            </div>
                            <span className="text-xs text-gray-300 text-center w-full truncate px-1">
                                {sentUsers.has(user.id) ? 'Sent' : user.displayName.split(' ')[0]}
                            </span>
                        </div>
                    ))}
                </div>
                
                {/* Horizontal Scroll Apps */}
                <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar">
                    {APPS.map((app, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[64px]" onClick={app.onClick}>
                            <div className={`w-12 h-12 rounded-full ${app.c} flex items-center justify-center text-white font-bold relative transition-transform active:scale-95`}>
                            {app.n === 'Repost' && hasReposted ? (
                                <Check size={24} className="animate-bounce" />
                            ) : (
                                app.i ? <app.i size={24} /> : app.n[0]
                            )}
                            
                            {/* Repost Badge */}
                            {app.n === 'Repost' && (
                                <div className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-bold px-1 rounded-full">
                                    New
                                </div>
                            )}
                            </div>
                            <span className={`text-xs ${app.n === 'Repost' ? 'text-brand-pink font-bold' : 'text-gray-400'}`}>
                                {app.n === 'Repost' && hasReposted ? 'Reposted' : app.n}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Horizontal Scroll Actions */}
                <div className="flex gap-6 overflow-x-auto border-t border-white/10 pt-4 pb-2 no-scrollbar">
                    {displayActions.map((Action, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[60px] active:opacity-50 transition-opacity" onClick={Action.onClick}>
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <Action.i size={20} className={Action.danger ? "text-red-500" : "text-white"} />
                            </div>
                            <span className={`text-xs whitespace-nowrap ${Action.danger ? "text-red-400" : "text-gray-400"}`}>{Action.n}</span>
                        </div>
                    ))}
                </div>
            </>
        )}
        </div>
        
        {/* Notification Toast for Repost */}
        {hasReposted && !showRepostInput && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center gap-2 animate-fade-in z-[70]">
                <div className="w-10 h-10 bg-brand-pink rounded-full flex items-center justify-center">
                    <Repeat size={24} className="text-white" />
                </div>
                <p className="text-white font-bold">Reposted!</p>
                <p className="text-gray-400 text-xs">Visible on your profile</p>
            </div>
        )}

        {/* Notification Toast for Not Interested */}
        {hasMarkedNotInterested && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center gap-2 animate-fade-in z-[70]">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <ThumbsDown size={24} className="text-white" />
                </div>
                <p className="text-white font-bold">Got it!</p>
                <p className="text-gray-400 text-xs">We'll show fewer videos like this.</p>
            </div>
        )}
        
        {/* Link Copied Toast */}
        {linkCopied && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl flex flex-col items-center gap-2 animate-fade-in z-[70]">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Link size={24} className="text-white" />
                </div>
                <p className="text-white font-bold">Link Copied!</p>
            </div>
        )}
    </div>
  );
};
