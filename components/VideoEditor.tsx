import React, { useState, useRef, useEffect } from 'react';
import { Play, Scissors, Type, Sticker, Mic, Check, ChevronLeft, Wand2, Sparkles, X, Move, Image as ImageIcon, Music as MusicIcon, Volume2, Clock, Trash2, AudioLines, PlusCircle, Loader, Undo2, PieChart, Volume1, Zap, Sliders, Captions, Pin, RefreshCw, Speaker } from 'lucide-react';
import { MusicPicker } from './MusicPicker';
import { CreationContext, MusicTrack, InteractiveElement, Clip, Keyframe } from '../types';
import { generateAISticker, generateTextToSpeech, generateVideoCaptions } from '../services/geminiService';
import { TimelineEditor } from './TimelineEditor';
import { StickerPicker } from './StickerPicker';

interface VideoEditorProps {
  fileUrl?: string;
  images?: string[]; 
  clips?: Clip[]; 
  musicTrack: MusicTrack | null;
  creationContext?: CreationContext;
  templateId?: string; 
  onSave: (renderedUrl?: string, interactiveElements?: InteractiveElement[]) => void;
  onCancel: () => void;
}

interface Overlay {
  id: number;
  type: 'text' | 'sticker' | 'image' | 'poll';
  content: string;
  style?: 'comment_reply'; 
  x: number; 
  y: number; 
  color?: string;
  bg?: string;
  scale: number;
  startTime: number; 
  endTime: number;
  pollOptions?: string[];
  ttsAudioBlob?: Blob; 
  ttsAudioUrl?: string; 
  keyframes: Keyframe[]; 
}

const COLORS = ['#FFFFFF', '#000000', '#FF4F9A', '#FFD700', '#009F6B', '#7000FF', '#FF0000'];
const EFFECTS = [
    { id: 'none', label: 'None', color: 'bg-gray-600', filter: 'none' },
    { id: 'vhs', label: 'VHS', color: 'bg-red-500', filter: 'sepia(0.5) contrast(1.2) saturate(1.2)' },
    { id: 'retro', label: 'Retro', color: 'bg-gray-400', filter: 'grayscale(1) contrast(1.1)' },
    { id: 'glitch', label: 'Glitch', color: 'bg-blue-500', filter: 'hue-rotate(90deg) contrast(1.5)' },
    { id: 'sparkle', label: 'Bling', color: 'bg-brand-gold', filter: 'brightness(1.2) saturate(1.1)' },
];
const DEFAULT_SLIDE_DURATION = 3; 

export const VideoEditor: React.FC<VideoEditorProps> = ({ fileUrl, images, clips: initialClips, musicTrack: initialMusicTrack, creationContext, templateId, onSave, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const duetRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const [currentMusicTrack, setCurrentMusicTrack] = useState<MusicTrack | null>(initialMusicTrack);
  const [clips, setClips] = useState<Clip[]>(initialClips || []);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isAutoSync, setIsAutoSync] = useState(false);
  const isSlideshow = !!images && images.length > 0;
  const isMultiClip = clips.length > 0;
  const slideDuration = isAutoSync ? 0.8 : DEFAULT_SLIDE_DURATION; 
  const [totalDuration, setTotalDuration] = useState(isSlideshow ? images.length * slideDuration : (isMultiClip ? clips.reduce((acc, c) => acc + (c.endTime - c.startTime)/1000, 0) : 15));
  const [speedSegments, setSpeedSegments] = useState<{start: number, end: number, rate: number}[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(null);
  const [textInput, setTextInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [textBg, setTextBg] = useState<string | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);
  const [enableTTS, setEnableTTS] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('Yes');
  const [pollOption2, setPollOption2] = useState('No');
  const ttsAudioRefs = useRef<Record<number, HTMLAudioElement>>({});
  const [isTrackingMode, setIsTrackingMode] = useState(false);

  useEffect(() => {
      if (creationContext?.type === 'reply') {
          setOverlays(prev => [...prev, { id: Date.now(), type: 'sticker', content: `${creationContext.comment.username}: ${creationContext.comment.text}`, style: 'comment_reply', x: 50, y: 20, scale: 1, startTime: 0, endTime: 1000, keyframes: [] }]);
      }
      if (templateId === 'retro_vibe') {
          setSelectedEffect('vhs');
          setOverlays(prev => [...prev, { id: Date.now() + 1, type: 'text', content: 'RETRO VIBES', x: 50, y: 80, scale: 1, color: '#FFD700', bg: '#000000', startTime: 0, endTime: 1000, keyframes: [] }]);
      } else if (templateId === 'flash_cut') {
          setSpeedSegments([{ start: 0, end: 100, rate: 1.5 }]);
          setSelectedEffect('glitch');
      } else if (templateId === 'slow_zoom') {
          setSpeedSegments([{ start: 0, end: 100, rate: 0.8 }]);
          setSelectedEffect('sparkle');
      }
  }, [creationContext, templateId]);

  useEffect(() => {
      if (isSlideshow) setTotalDuration(images.length * slideDuration);
      else if (isMultiClip) setTotalDuration(clips.reduce((acc, c) => acc + (c.endTime - c.startTime)/1000, 0));
  }, [isAutoSync, images, slideDuration, clips]);

  useEffect(() => {
    syncPlay();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, currentMusicTrack]); 

  const handleGenerateCaptions = async () => {
      if (!fileUrl && !isMultiClip) return;
      setIsGeneratingCaptions(true);
      try {
          const response = await fetch(fileUrl || clips[0].url);
          const blob = await response.blob();
          const transcriptions = await generateVideoCaptions(blob);
          const newOverlays: Overlay[] = transcriptions.map((t, i) => ({ id: Date.now() + i, type: 'text', content: t.text, x: 50, y: 85, scale: 0.8, color: '#FFFFFF', bg: 'rgba(0,0,0,0.5)', startTime: t.start, endTime: t.end, keyframes: [] }));
          setOverlays(prev => [...prev, ...newOverlays]);
      } catch (e) { alert("Caption gen failed"); } finally { setIsGeneratingCaptions(false); }
  };

  const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp - (currentTime * 1000);
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      let newTime = elapsed;
      if (newTime >= totalDuration) {
          newTime = 0; startTimeRef.current = timestamp; setCurrentClipIndex(0); 
          if (audioRef.current) audioRef.current.currentTime = 0;
          if (duetRef.current) duetRef.current.currentTime = 0;
          Object.values(ttsAudioRefs.current).forEach((a) => { if (a) { (a as HTMLAudioElement).pause(); (a as HTMLAudioElement).currentTime = 0; } });
          if (isRendering) { setIsRendering(false); return; }
      }
      const currentSpeedSeg = speedSegments.find(s => newTime >= s.start && newTime <= s.end);
      const playbackRate = currentSpeedSeg ? currentSpeedSeg.rate : 1;
      if (videoRef.current) videoRef.current.playbackRate = playbackRate;
      if (duetRef.current) duetRef.current.playbackRate = playbackRate;
      setCurrentTime(newTime); setProgress((newTime / totalDuration) * 100);
      if (isRendering) setRenderProgress((newTime / totalDuration) * 100);
      if (isPlaying) {
          overlays.forEach(overlay => {
              if (overlay.ttsAudioUrl) {
                  if (newTime >= overlay.startTime && newTime <= overlay.endTime) {
                      let audio = ttsAudioRefs.current[overlay.id];
                      if (!audio && overlay.ttsAudioUrl) { audio = new Audio(overlay.ttsAudioUrl); ttsAudioRefs.current[overlay.id] = audio; }
                      if (audio && audio.paused && Math.abs(newTime - overlay.startTime) < 0.1) audio.play().catch(() => {});
                  } else {
                      const audio = ttsAudioRefs.current[overlay.id];
                      if (audio && !audio.paused) { audio.pause(); audio.currentTime = 0; }
                  }
              }
          });
      }
      if (isMultiClip) {
          let accumulatedTime = 0; let foundIndex = 0;
          for (let i = 0; i < clips.length; i++) {
              const clipDuration = (clips[i].endTime - clips[i].startTime) / 1000;
              if (newTime >= accumulatedTime && newTime < accumulatedTime + clipDuration) { foundIndex = i; break; }
              accumulatedTime += clipDuration;
          }
          if (foundIndex !== currentClipIndex) setCurrentClipIndex(foundIndex);
          if (videoRef.current) {
              const clipRelativeTime = (newTime - accumulatedTime) + (clips[foundIndex].startTime / 1000);
              if (Math.abs(videoRef.current.currentTime - clipRelativeTime) > 0.5) videoRef.current.currentTime = clipRelativeTime;
          }
      }
      if (audioRef.current && Math.abs(audioRef.current.currentTime - newTime) > 0.3) audioRef.current.currentTime = newTime;
      if (isPlaying || isRendering) requestRef.current = requestAnimationFrame(animate);
  };

  const syncPlay = () => {
      if (isRendering) return;
      if (isPlaying) {
          videoRef.current?.play().catch(() => {}); duetRef.current?.play().catch(() => {}); audioRef.current?.play().catch(() => {});
          if (!requestRef.current) startTimeRef.current = performance.now() - (currentTime * 1000);
          requestRef.current = requestAnimationFrame(animate);
      } else {
          videoRef.current?.pause(); duetRef.current?.pause(); audioRef.current?.pause();
          Object.values(ttsAudioRefs.current).forEach((a) => { if (a) (a as HTMLAudioElement).pause(); });
          if (requestRef.current) { cancelAnimationFrame(requestRef.current); requestRef.current = 0; }
      }
  };

  const handleAddText = async () => {
      if (textInput.trim()) {
          let ttsBlob, ttsUrl;
          if (enableTTS) {
              const audioBuffer = await generateTextToSpeech(textInput);
              if (audioBuffer) { ttsBlob = new Blob([audioBuffer], { type: 'audio/wav' }); ttsUrl = URL.createObjectURL(ttsBlob); }
          }
          setOverlays(prev => [...prev, { id: Date.now(), type: 'text', content: textInput, x: 50, y: 50, scale: 1, color: selectedColor, bg: textBg, startTime: 0, endTime: totalDuration, ttsAudioBlob: ttsBlob, ttsAudioUrl: ttsUrl, keyframes: [] }]);
          setIsTyping(false); setTextInput(''); setEnableTTS(false);
      } else setIsTyping(false);
  };

  const handleStickerMove = (e: React.MouseEvent | React.TouchEvent, overlayId: number) => {
      if (!isTrackingMode || overlayId !== selectedOverlayId) return;
      const rect = containerRef.current?.getBoundingClientRect(); if (!rect) return;
      let cx, cy;
      if ('touches' in e) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      else { cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY; }
      const x = ((cx - rect.left) / rect.width) * 100, y = ((cy - rect.top) / rect.height) * 100;
      setOverlays(prev => prev.map(o => o.id === overlayId ? { ...o, x, y, keyframes: [...(o.keyframes || []), { timestamp: currentTime, x, y, scale: o.scale, rotation: 0 }].sort((a,b) => a.timestamp - b.timestamp) } : o));
  };

  const getPos = (overlay: Overlay) => {
      if (isTrackingMode && overlay.id === selectedOverlayId) return { x: overlay.x, y: overlay.y };
      if (!overlay.keyframes || overlay.keyframes.length === 0) return { x: overlay.x, y: overlay.y };
      const prev = [...overlay.keyframes].reverse().find(k => k.timestamp <= currentTime);
      const next = overlay.keyframes.find(k => k.timestamp > currentTime);
      if (prev && next) {
          const progress = (currentTime - prev.timestamp) / (next.timestamp - prev.timestamp);
          return { x: prev.x + (next.x - prev.x) * progress, y: prev.y + (next.y - prev.y) * progress };
      }
      return prev ? { x: prev.x, y: prev.y } : { x: overlay.x, y: overlay.y };
  };

  const TOOLS = [
    { id: 'text', icon: Type, label: 'Text', action: () => { setIsTyping(true); setTextInput(''); setTextBg(undefined); } },
    { id: 'captions', icon: Captions, label: 'Captions', action: handleGenerateCaptions },
    { id: 'sticker', icon: Sticker, label: 'Sticker', action: () => setActiveTool('sticker') },
    { id: 'speed', icon: Zap, label: 'Speed', action: () => setActiveTool('speed') },
    { id: 'poll', icon: PieChart, label: 'Poll', action: () => setIsCreatingPoll(true) }, 
    { id: 'effects', icon: Wand2, label: 'Effects', action: () => setActiveTool('effects') },
  ];

  const currentSlideIdx = isSlideshow ? Math.floor(currentTime / slideDuration) % (images?.length || 1) : 0;
  const isDuet = creationContext?.type === 'duet';

  return (
    <div className="w-full h-full bg-brand-dark flex flex-col relative z-50 animate-slide-up overflow-hidden">
      {/* Updated Header with pt-safe for notch compatibility */}
      <div className="flex justify-between items-center p-4 pt-safe z-20 bg-brand-dark/50 backdrop-blur-md sticky top-0 shrink-0">
          <button onClick={onCancel} className="p-2 -ml-2 text-white active:opacity-50"><X /></button>
          <button 
            onClick={() => onSave(isMultiClip ? clips[0].url : fileUrl, overlays)} 
            className="bg-brand-pink text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-pink/40 hover:brightness-110 active:scale-95 transition-all"
          >
             NEXT
          </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden" ref={containerRef} onClick={() => { if (selectedOverlayId && !isTrackingMode) setSelectedOverlayId(null); else setIsPlaying(!isPlaying); }}>
        <div className={`w-full h-full flex items-center justify-center ${isDuet ? 'flex-row p-1' : ''}`}>
            {isDuet && creationContext?.type === 'duet' && (
                <div className="w-1/2 h-full bg-black relative rounded-l-xl overflow-hidden border-r border-white/10">
                     <video ref={duetRef} src={creationContext.video.url} className="w-full h-full object-contain" playsInline muted crossOrigin="anonymous" />
                </div>
            )}
            <div className={`relative h-full overflow-hidden ${isDuet ? 'w-1/2 rounded-r-xl' : 'w-full'}`}>
                {isSlideshow ? (
                   <div className="w-full h-full relative">
                       {images.map((img, idx) => (
                           <img key={idx} src={img} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${idx === currentSlideIdx ? 'opacity-100' : 'opacity-0'}`} />
                       ))}
                   </div>
                ) : (
                    <video ref={videoRef} src={isMultiClip ? clips[currentClipIndex]?.url : fileUrl} crossOrigin="anonymous" className={`w-full h-full object-contain transition-all duration-300 ${selectedEffect === 'vhs' ? 'sepia contrast-125' : selectedEffect === 'retro' ? 'grayscale' : ''}`} playsInline loop={!isMultiClip} onLoadedMetadata={() => !isMultiClip && setTotalDuration(videoRef.current?.duration || 15)} />
                )}
                {overlays.map(o => {
                    const pos = getPos(o);
                    if (!(currentTime >= o.startTime && currentTime <= (o.endTime || totalDuration))) return null;
                    return (
                        <div key={o.id} className={`absolute p-2 rounded transform cursor-move ${selectedOverlayId === o.id ? 'ring-2 ring-brand-pink bg-black/20 z-30' : 'z-20'}`} style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) scale(${o.scale})` }} onClick={(e) => { e.stopPropagation(); setSelectedOverlayId(o.id); }} onTouchMove={(e) => handleStickerMove(e, o.id)}>
                            {o.type === 'text' && <span className={`text-xl font-bold px-2 py-1 rounded ${o.bg ? 'text-black' : ''}`} style={{ color: o.bg ? 'black' : o.color, backgroundColor: o.bg || 'transparent' }}>{o.content}{o.ttsAudioUrl && <Speaker size={12} className="inline ml-1 opacity-50" />}</span>}
                            {o.type === 'sticker' && <span className="text-6xl drop-shadow-lg">{o.content}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
        {!isPlaying && <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"><div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center"><Play size={40} className="text-white fill-white ml-1" /></div></div>}
      </div>

      {isTyping && (
          <div className="absolute inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6 animate-fade-in">
              <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)} className="bg-transparent text-white font-black text-center text-4xl outline-none w-full mb-12" placeholder="TEXT HERE" />
              <div className="flex gap-4 mb-12 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                  {COLORS.map(c => <button key={c} className={`w-8 h-8 rounded-full border-2 ${selectedColor === c ? 'border-white scale-125 shadow-lg shadow-white/20' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setSelectedColor(c)} />)}
                  <button onClick={() => setEnableTTS(!enableTTS)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${enableTTS ? 'bg-brand-pink text-white border-brand-pink' : 'border-white text-white'}`}><Speaker size={14} /> VOICE</button>
              </div>
              <button onClick={handleAddText} className="w-full max-w-xs bg-brand-pink text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl">DONE</button>
          </div>
      )}

      {activeTool === 'sticker' && <StickerPicker onSelect={(c, t) => { setOverlays(prev => [...prev, { id: Date.now(), type: t, content: c, x: 50, y: 50, scale: 1, startTime: 0, endTime: totalDuration, keyframes: [] }]); setActiveTool(null); }} onClose={() => setActiveTool(null)} />}

      <div className="h-64 bg-brand-indigo/95 backdrop-blur-xl flex flex-col border-t border-white/10 pb-safe shrink-0">
         <div className="flex items-center gap-8 px-6 py-5 overflow-x-auto no-scrollbar">
             {TOOLS.map(tool => (
                 <button key={tool.id} onClick={tool.action} className="flex flex-col items-center gap-1.5 min-w-[60px] text-gray-400 hover:text-white transition-colors active:scale-90">
                     <tool.icon size={22} />
                     <span className="text-[10px] font-black uppercase tracking-tight">{tool.label}</span>
                 </button>
             ))}
         </div>
         <div className="flex-1 p-6 flex flex-col justify-center">
             <div className="flex justify-between text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest"><span>START</span><span>{totalDuration.toFixed(1)}S</span></div>
             <div className="relative h-14 w-full bg-white/5 rounded-xl overflow-hidden border border-white/5">
                 <div className="absolute inset-0 flex opacity-20">
                     {isSlideshow ? images.map((_, i) => <div key={i} className="flex-1 border-r border-white/20"></div>) : [...Array(10)].map((_, i) => <div key={i} className="flex-1 border-r border-white/10"></div>)}
                 </div>
                 <div className="absolute top-0 bottom-0 w-0.5 bg-brand-pink shadow-[0_0_10px_#FF4F9A] z-10" style={{ left: `${progress}%` }} />
             </div>
         </div>
      </div>
    </div>
  );
};
