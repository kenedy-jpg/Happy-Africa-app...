
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Heart, Video as VideoIcon, Copy, Flag, Trash2, Loader, Languages } from 'lucide-react';
import { Comment, User } from '../types';
import { backend } from '../services/backend';
import { supabase } from '../services/supabaseClient'; 
import { translateText } from '../services/geminiService';

interface CommentsSheetProps {
  videoId?: string; // ID to fetch comments for
  comments?: Comment[]; // Optional fallback
  currentUser: User;
  onClose: () => void;
  onRequireAuth: (cb: () => void) => void;
  isLoggedIn: boolean;
  onReplyWithVideo?: (comment: Comment) => void;
  onAddComment?: (text: string) => void;
  highlightCommentId?: string | number; // New Prop
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({ 
  videoId,
  comments: initialComments = [], 
  currentUser, 
  onClose,
  onRequireAuth,
  isLoggedIn,
  onReplyWithVideo,
  onAddComment,
  highlightCommentId
}) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  
  // Drawer State
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState<'60%' | '95%'>('60%');
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [longPressedComment, setLongPressedComment] = useState<Comment | null>(null);
  const longPressTimer = useRef<number | null>(null);

  // Translation State
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<Record<string, boolean>>({});

  // Real-time Subscription Ref
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchComments = async () => {
      if (videoId) {
        setIsLoading(true);
        try {
          const fetched = await backend.content.getComments(videoId);
          setComments(fetched);
        } catch (error) {
          console.error("Failed to load comments", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchComments();

    if (videoId) {
        // Sync with the 'supabase_realtime' publication we just fixed
        const channel = supabase.channel(`comments_${videoId}`)
            .on(
                'postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `video_id=eq.${videoId}` },
                async (payload) => {
                    const newCommentRaw = payload.new;
                    // Only add if it's not from us (we already added ours optimistically)
                    if (newCommentRaw.user_id !== currentUser.id) {
                         const { data: actor } = await supabase.from('profiles').select('username, avatar_url').eq('id', newCommentRaw.user_id).single();
                         
                         const incomingComment: Comment = {
                             id: newCommentRaw.id,
                             username: actor?.username || 'User',
                             text: newCommentRaw.text,
                             createdAt: 'Just now',
                             likes: 0,
                             avatarUrl: actor?.avatar_url || ''
                         };
                         
                         setComments(prev => [incomingComment, ...prev]);
                    }
                }
            )
            .subscribe();
        
        channelRef.current = channel;
    }

    return () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [videoId, currentUser.id]);

  // Handle auto-scroll to highlighted comment
  useEffect(() => {
      if (highlightCommentId && comments.length > 0 && !isLoading) {
          const el = commentRefs.current[highlightCommentId];
          if (el) {
              setTimeout(() => {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('bg-white/10');
                  setTimeout(() => el.classList.remove('bg-white/10'), 2000);
              }, 300);
          }
      }
  }, [highlightCommentId, comments, isLoading]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop > 0) return;
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    if (contentRef.current && contentRef.current.scrollTop > 0) return;

    const deltaY = e.touches[0].clientY - startY;
    setCurrentY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (currentY > 150) {
      if (drawerHeight === '95%') {
          setDrawerHeight('60%');
          setCurrentY(0);
      } else {
          handleClose();
      }
    } else if (currentY < -100) {
        setDrawerHeight('95%');
        setCurrentY(0);
    } else {
      setCurrentY(0);
    }
    setStartY(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const handleSend = async () => {
    onRequireAuth(async () => {
        if (commentText.trim()) {
            const text = commentText;
            setCommentText('');
            setReplyingTo(null);

            const newComment: Comment = {
                id: Date.now(),
                username: currentUser.username,
                text: text,
                createdAt: 'Just now',
                likes: 0,
                avatarUrl: currentUser.avatarUrl
            };
            
            // Optimistic update
            setComments(prev => [newComment, ...prev]);

            if (contentRef.current) {
                contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }

            if (videoId) {
               await backend.content.addComment(videoId, newComment);
            }
            if (onAddComment) onAddComment(text);
        }
    });
  };

  const toggleCommentLike = (id: string | number) => {
      onRequireAuth(() => {
          setLikedComments(prev => ({
              ...prev,
              [id]: !prev[id]
          }));
      });
  };

  const handleReply = (username: string) => {
      onRequireAuth(() => {
          setReplyingTo(username);
          if (inputRef.current) {
              inputRef.current.focus();
          }
      });
  };

  const handleCommentTouchStart = (comment: Comment) => {
      longPressTimer.current = window.setTimeout(() => {
          setLongPressedComment(comment);
      }, 500);
  };

  const handleCommentTouchEnd = () => {
      if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
      }
  };

  const handleFocus = (e: React.FocusEvent) => {
    if (!isLoggedIn) {
        (e.target as HTMLElement).blur();
        onRequireAuth(() => {});
    }
  };

  const toggleTranslation = async (commentId: string, text: string) => {
      if (translatedComments[commentId]) {
          const newMap = { ...translatedComments };
          delete newMap[commentId];
          setTranslatedComments(newMap);
          return;
      }

      setLoadingTranslations(prev => ({ ...prev, [commentId]: true }));
      const translated = await translateText(text);
      setTranslatedComments(prev => ({ ...prev, [commentId]: translated }));
      setLoadingTranslations(prev => ({ ...prev, [commentId]: false }));
  };

  const handleVideoReplyClick = () => {
      if (onReplyWithVideo && longPressedComment) {
          onReplyWithVideo(longPressedComment);
          setLongPressedComment(null);
          handleClose();
      }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity duration-300" onClick={handleClose}>
       <div 
         ref={sheetRef}
         className={`absolute bottom-0 w-full bg-brand-dark rounded-t-xl flex flex-col will-change-transform ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
         style={{ 
           height: drawerHeight,
           transform: `translateY(${Math.max(0, currentY)}px)`,
           transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease-out'
         }}
         onClick={(e) => e.stopPropagation()}
       >
          <div 
            className="w-full flex flex-col items-center pt-2 pb-0 rounded-t-xl cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
             <div className="w-10 h-1 bg-white/20 rounded-full mb-3"></div>
             <div className="w-full flex justify-between items-center px-4 pb-3 border-b border-white/10">
                 <div className="w-4"></div>
                 <span className="font-bold text-xs text-white">{comments.length} comments</span>
                 <button onClick={handleClose}>
                   <X size={14} className="text-gray-400" />
                 </button>
             </div>
          </div>

          <div 
            ref={contentRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 overscroll-contain"
          >
             {isLoading ? (
                 <div className="flex justify-center py-10">
                     <Loader className="animate-spin text-brand-pink" />
                 </div>
             ) : comments.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">
                     No comments yet. Be the first to say something!
                 </div>
             ) : (
                 comments.map(comment => (
                    <div 
                        key={comment.id} 
                        ref={el => commentRefs.current[comment.id] = el}
                        className={`flex gap-3 active:opacity-70 transition-all rounded-lg p-1 ${highlightCommentId === comment.id ? 'bg-white/10' : ''}`}
                        onTouchStart={() => handleCommentTouchStart(comment)}
                        onTouchEnd={handleCommentTouchEnd}
                        onContextMenu={(e) => {e.preventDefault(); setLongPressedComment(comment);}}
                    >
                       <div className="w-8 h-8 rounded-full bg-brand-indigo overflow-hidden shrink-0 border border-white/10">
                          <img 
                            src={comment.avatarUrl || `https://picsum.photos/100/100?random=${comment.id}`} 
                            className="w-full h-full object-cover" 
                            alt={comment.username}
                          />
                       </div>
                       <div className="flex-1">
                          <p className="text-xs font-bold text-gray-400 mb-0.5">{comment.username}</p>
                          
                          <p className="text-sm text-gray-200">
                              {translatedComments[comment.id] || comment.text}
                          </p>
                          
                          <button 
                             onClick={() => toggleTranslation(comment.id.toString(), comment.text)}
                             className="text-[10px] font-bold text-brand-pink mt-1 flex items-center gap-1"
                          >
                              {loadingTranslations[comment.id] ? (
                                  <Loader size={8} className="animate-spin" />
                              ) : (
                                  <Languages size={10} />
                              )}
                              {translatedComments[comment.id] ? "See Original" : "Translate"}
                          </button>

                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                             <span>{comment.createdAt}</span>
                             <span onClick={() => handleReply(comment.username)} className="font-bold cursor-pointer hover:text-gray-300">Reply</span>
                          </div>
                       </div>
                       <div 
                         className="flex flex-col items-center gap-1 cursor-pointer"
                         onClick={() => toggleCommentLike(comment.id)}
                       >
                          <Heart 
                            size={14} 
                            className={`transition-colors ${likedComments[comment.id] ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} 
                          />
                          <span className="text-xs text-gray-500">
                              {comment.likes + (likedComments[comment.id] ? 1 : 0)}
                          </span>
                       </div>
                    </div>
                 ))
             )}
          </div>

          <div className="p-3 border-t border-white/10 flex flex-col gap-2 pb-safe bg-brand-dark">
             {replyingTo && (
                <div className="flex justify-between items-center px-2 text-xs text-gray-400">
                    <span>Replying to <b>@{replyingTo}</b></span>
                    <button onClick={() => setReplyingTo(null)}><X size={12} /></button>
                </div>
             )}
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0 border border-white/10">
                    {isLoggedIn ? (
                        <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="Me" />
                    ) : (
                        <div className="w-full h-full bg-brand-indigo"></div>
                    )}
                </div>
                <input 
                    ref={inputRef}
                    className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none text-white placeholder-gray-500" 
                    placeholder={isLoggedIn ? (replyingTo ? `Reply to ${replyingTo}...` : "Add comment...") : "Log in to comment"}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onFocus={handleFocus}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    className="p-2 text-brand-pink font-bold active:scale-90 transition-transform"
                >
                    <Send size={20} />
                </button>
             </div>
          </div>
       </div>

       {longPressedComment && (
           <div className="absolute inset-0 z-[70] bg-black/60 flex items-center justify-center p-8 animate-fade-in" onClick={() => setLongPressedComment(null)}>
               <div className="w-full bg-gray-800 rounded-xl overflow-hidden shadow-2xl animate-slide-up">
                   <div className="p-4 border-b border-white/10">
                       <p className="text-xs text-gray-400 font-bold mb-1">@{longPressedComment.username}</p>
                       <p className="text-sm text-white line-clamp-2">{longPressedComment.text}</p>
                   </div>
                   <div className="flex flex-col">
                       <button 
                         onClick={handleVideoReplyClick}
                         className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 text-white font-medium text-sm transition-colors"
                       >
                           <VideoIcon size={18} className="text-brand-pink" /> Reply with Video
                       </button>
                       <button className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 text-white font-medium text-sm transition-colors">
                           <Copy size={18} /> Copy
                       </button>
                       {longPressedComment.username === currentUser.username && (
                            <button 
                                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 text-red-500 font-medium text-sm transition-colors"
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                       )}
                       <button className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 text-gray-400 font-medium text-sm transition-colors">
                           <Flag size={18} /> Report
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
