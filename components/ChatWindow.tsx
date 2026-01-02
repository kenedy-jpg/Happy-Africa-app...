
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Phone, Video, MoreVertical, Image as ImageIcon, Smile, Play, Loader, Sparkles, Mic, Heart, Check, CheckCheck } from 'lucide-react';
import { User, Message, ChatSession } from '../types';
import { backend } from '../services/backend';
import { generateSmartReplies } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

interface ChatWindowProps {
  currentUser: User;
  session: ChatSession;
  onSendMessage: (text: string, attachment?: any) => void;
  onBack: () => void;
  onCall: (isVideo: boolean) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, session, onSendMessage, onBack, onCall }) => {
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef<number | null>(null);

  const [messages, setMessages] = useState<Message[]>(session.messages);
  
  // --- ROBUST REAL-TIME CONNECTION ---
  useEffect(() => {
      setMessages(session.messages);

      const channelName = `chat_${session.id}_${currentUser.id}`;
      console.log(`[Realtime] Connecting to ${channelName}`);

      const channel = supabase.channel(channelName)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${currentUser.id}` 
        }, (payload) => {
            console.log('[Realtime] New incoming message detected:', payload.new);
            // Only add if it's from the person I'm currently chatting with
            if (payload.new.sender_id === session.user.id) {
                const newMsg: Message = {
                    id: payload.new.id,
                    senderId: payload.new.sender_id,
                    text: payload.new.text,
                    createdAt: new Date(payload.new.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: false,
                    type: 'text'
                };
                setMessages(prev => {
                    // Prevent duplicates
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
            }
        })
        .subscribe((status) => {
            console.log(`[Realtime] Subscription status for ${channelName}: ${status}`);
            if (status === 'CHANNEL_ERROR') {
                console.error('[Realtime] Subscription error. Tables might not be in Replication list yet.');
            }
        });

      return () => { 
          console.log(`[Realtime] Disconnecting ${channelName}`);
          supabase.removeChannel(channel); 
      };
  }, [session.id, currentUser.id, session.user.id]);

  const chatPartner = session.user;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg.isMe && !lastMsg.attachment && lastMsg.type === 'text') {
            generateSmartReplies(lastMsg.text).then(setSmartReplies);
        } else {
            setSmartReplies([]);
        }
    }
  }, [messages]);

  const handleSend = (text: string = inputText, attachment?: any) => {
    if (!text.trim() && !attachment) return;
    
    // Optimistic Update
    const tempId = `temp_${Date.now()}`;
    const newMsg: Message = {
        id: tempId,
        senderId: currentUser.id,
        text: text,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        type: 'text',
        attachment
    };
    setMessages(prev => [...prev, newMsg]);
    
    // Persistence
    onSendMessage(text, attachment);
    setInputText('');
    setSmartReplies([]);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploading(true);
          try {
              const url = await backend.content.uploadImage(file, 'images');
              const attachment = { type: 'image' as const, id: `img_${Date.now()}`, cover: url, title: 'Image' };
              handleSend('Sent an image', attachment);
          } catch (err) {
              alert("Failed to upload image");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];
          recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
          recorder.onstop = () => {
              const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              handleSend('Voice Message', { type: 'audio' as any, id: `aud_${Date.now()}`, cover: '', title: 'Voice Message', audioUrl: url, duration: recordingDuration });
              setRecordingDuration(0);
          };
          recorder.start();
          setIsRecording(true);
          recordingInterval.current = window.setInterval(() => setRecordingDuration(p => p + 1), 1000);
      } catch (e) { alert("Microphone access needed"); }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (recordingInterval.current) clearInterval(recordingInterval.current);
      }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-white text-black flex flex-col animate-slide-right">
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-white sticky top-0 z-10 pt-safe">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={24} className="text-black" /></button>
          <div className="relative">
             <img src={chatPartner.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
             <span className="font-bold text-sm">{chatPartner.displayName}</span>
             <span className="text-xs text-gray-500">Active now</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-600">
           <button onClick={() => onCall(false)} className="active:scale-90 transition-transform"><Phone size={22} /></button>
           <button onClick={() => onCall(true)} className="active:scale-90 transition-transform"><Video size={22} /></button>
           <MoreVertical size={22} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-24">
         <div className="flex flex-col gap-1 py-4">
             <img src={chatPartner.avatarUrl} className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-white shadow-sm" />
             <p className="text-center font-bold text-lg">{chatPartner.displayName}</p>
             <p className="text-center text-xs text-gray-400 mb-8">Happy Africa Community Member</p>
         </div>

         {messages.map((msg) => (
           <div key={msg.id} className={`flex w-full mb-3 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
              {!msg.isMe && <img src={chatPartner.avatarUrl} className="w-8 h-8 rounded-full mr-2 self-end mb-1" />}
              <div className={`max-w-[70%] relative ${msg.attachment && msg.attachment.type !== 'audio' ? 'p-0 overflow-hidden' : 'px-4 py-2'} rounded-2xl text-sm ${msg.isMe ? 'bg-brand-pink text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                 {msg.attachment ? (
                     msg.attachment.type === 'image' ? (
                        <div className="flex flex-col">
                            <img src={msg.attachment.cover} className="w-56 h-auto" />
                            {msg.text && msg.text !== 'Sent an image' && <p className="p-2 text-white">{msg.text}</p>}
                        </div>
                     ) : <span className="italic">{msg.text}</span>
                 ) : <span>{msg.text}</span>}
              </div>
           </div>
         ))}
         <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 flex flex-col pb-safe shadow-2xl">
          {smartReplies.length > 0 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-md">
                  <div className="flex items-center gap-1 text-[10px] font-black text-brand-pink mr-1 uppercase tracking-tighter shrink-0"><Sparkles size={10} /> AI Reply</div>
                  {smartReplies.map((reply, i) => <button key={i} onClick={() => handleSend(reply)} className="bg-gray-100 border border-gray-200 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap active:bg-brand-pink active:text-white transition-colors">{reply}</button>)}
              </div>
          )}
          <div className="p-3 flex items-center gap-3 relative z-10 bg-white">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
              <button className="text-gray-400 p-1 active:scale-90" onClick={() => fileInputRef.current?.click()}><ImageIcon size={24} /></button>
              <div className="flex-1 bg-gray-100 rounded-full flex items-center px-4 py-2 border border-gray-200">
                 <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Send a message..." className="bg-transparent flex-1 outline-none text-sm" onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                 <Smile size={20} className="text-gray-400" />
              </div>
              {inputText.trim() ? <button onClick={() => handleSend()} className="p-2 text-brand-pink active:scale-90 transition-transform"><Send size={24} /></button> : <button onMouseDown={startRecording} onMouseUp={stopRecording} className={`p-2 transition-colors active:scale-125 ${isRecording ? 'text-brand-pink' : 'text-gray-400'}`}><Mic size={24} /></button>}
          </div>
      </div>
    </div>
  );
};
