import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Zap, Check, Music, Wand2, Image as ImageIcon, Delete, Sparkles, Loader, Mic, MicOff } from 'lucide-react';
import { MusicPicker } from './MusicPicker';
import { CreationContext, MusicTrack, Clip } from '../types';

interface CameraCaptureProps {
  onCapture: (blobUrl: string, clips?: Clip[], metadata?: { templateId?: string }) => void;
  onClose: () => void;
  onSelectTrack: (track: MusicTrack) => void;
  selectedTrack: MusicTrack | null;
  onSwitchToLive?: () => void;
  creationContext?: CreationContext;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FILTERS = [
    { name: 'Normal', value: 'none' },
    { name: 'Vibrant', value: 'saturate(1.5) contrast(1.1)' },
    { name: 'B&W', value: 'grayscale(1)' },
    { name: 'Warm', value: 'sepia(0.3) saturate(1.2)' },
];

const SPEEDS = [
    { val: 0.3, label: '0.3x' },
    { val: 0.5, label: '0.5x' },
    { val: 1, label: '1x' },
    { val: 2, label: '2x' },
];

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, onSelectTrack, selectedTrack, creationContext, onFileSelect }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number>(0);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  
  const [clips, setClips] = useState<Clip[]>([]);
  const [currentSegmentDuration, setCurrentSegmentDuration] = useState(0);
  const [totalRecordedTime, setTotalRecordedTime] = useState(0);
  
  const progressInterval = useRef<number | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [recordingSpeed, setRecordingSpeed] = useState(1);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const MODES = ['Photo', '15s', '60s'];
  const [activeMode, setActiveMode] = useState('15s');

  const maxDuration = activeMode === '60s' ? 60000 : 15000;

  useEffect(() => {
    startCamera();
    return () => {
        stopCamera();
        if (audioRef.current) audioRef.current.pause();
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [facingMode]);

  useEffect(() => {
      const render = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState >= 2) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                  }
                  ctx.filter = activeFilter.value;
                  ctx.save();
                  if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  ctx.restore();
                  ctx.filter = 'none';
              }
          }
          requestRef.current = requestAnimationFrame(render);
      };
      render();
  }, [activeFilter, facingMode]);

  const startCamera = async () => {
    stopCamera(); 
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 24 } }, 
        audio: true 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) { console.error("Camera denied", err); }
  };

  const stopCamera = () => { if (stream) stream.getTracks().forEach(track => track.stop()); };

  const startRecording = async () => {
    if (activeMode === 'Photo') { capturePhoto(); return; }
    if (!canvasRef.current || !stream) return;
    
    // Set up Music Player
    const trackToPlay = selectedTrack || (creationContext?.type === 'sound' ? creationContext.track : null);
    if (trackToPlay && trackToPlay.audioUrl) {
        if (!audioRef.current) {
            audioRef.current = new Audio(trackToPlay.audioUrl);
            audioRef.current.crossOrigin = "anonymous"; 
        } else {
            audioRef.current.src = trackToPlay.audioUrl;
        }
        audioRef.current.currentTime = totalRecordedTime / 1000;
        audioRef.current.playbackRate = recordingSpeed;
        audioRef.current.play().catch(console.error);
    }

    chunksRef.current = [];
    const canvasStream = canvasRef.current.captureStream(24); 

    // --- AUDIO MIXING LOGIC ---
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Fix: Explicitly resume AudioContext for browsers that block it
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        
        const destination = audioCtx.createMediaStreamDestination();
        
        // 1. Microphone Source
        const micSource = audioCtx.createMediaStreamSource(stream);
        const micGain = audioCtx.createGain();
        micGain.gain.value = isMuted ? 0 : 1.0;
        micSource.connect(micGain);
        micGain.connect(destination);

        // 2. Music Source (if active)
        if (audioRef.current && trackToPlay) {
            const musicSource = audioCtx.createMediaElementSource(audioRef.current);
            const musicGain = audioCtx.createGain();
            musicGain.gain.value = 0.8; 
            musicSource.connect(musicGain);
            musicGain.connect(destination);
            musicGain.connect(audioCtx.destination);
        }

        const mixedAudioTrack = destination.stream.getAudioTracks()[0];
        canvasStream.addTrack(mixedAudioTrack);
    } catch (e) {
        console.warn("Audio mixing fallback", e);
        if (stream) stream.getAudioTracks().forEach(t => canvasStream.addTrack(t.clone()));
    }

    let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        options = { mimeType: 'video/mp4;codecs=avc1' };
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        options = { mimeType: 'video/webm;codecs=h264' };
    }
    
    const mediaRecorder = new MediaRecorder(canvasStream, options);
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => { 
        if (event.data.size > 0) chunksRef.current.push(event.data); 
    };

    mediaRecorder.onstop = () => {
      if (audioRef.current) audioRef.current.pause();
      const blob = new Blob(chunksRef.current, { type: options.mimeType });
      const videoUrl = URL.createObjectURL(blob);
      const duration = currentSegmentDuration;
      const newClip: Clip = { id: Date.now().toString(), url: videoUrl, duration, startTime: 0, endTime: duration };
      setClips(prev => [...prev, newClip]);
      setTotalRecordedTime(prev => prev + duration);
      setCurrentSegmentDuration(0);
    };

    mediaRecorder.start(1000); 
    setIsRecording(true);
    
    const startTime = Date.now();
    progressInterval.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) * recordingSpeed;
        setCurrentSegmentDuration(elapsed);
        if (totalRecordedTime + elapsed >= maxDuration) stopRecording();
    }, 100); 
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  };

  const capturePhoto = () => {
      if (!canvasRef.current) return;
      setIsCapturingPhoto(true);
      const photoUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      setClips(prev => [...prev, { id: `photo_${Date.now()}`, url: photoUrl, duration: 3000, startTime: 0, endTime: 3000 }]);
      setTotalRecordedTime(prev => prev + 3000);
      setTimeout(() => setIsCapturingPhoto(false), 300);
  };

  return (
    <div className="absolute inset-0 bg-brand-indigo z-50 flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="video/*,image/*" 
        onChange={onFileSelect} 
      />

      <div className="relative flex-1 bg-brand-dark rounded-b-2xl overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="absolute opacity-0 w-px h-px" />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        {isCapturingPhoto && <div className="absolute inset-0 bg-white animate-fade-out z-40"></div>}

        <div className="absolute top-0 left-0 w-full h-1.5 flex bg-gray-500/30 z-30">
            {clips.map(clip => (
                <div key={clip.id} className="h-full bg-brand-pink border-r border-black" style={{ width: `${(clip.duration / maxDuration) * 100}%` }}></div>
            ))}
            {isRecording && <div className="h-full bg-brand-pink relative animate-pulse" style={{ width: `${(currentSegmentDuration / maxDuration) * 100}%` }}></div>}
        </div>

        <div className="absolute top-4 left-0 w-full px-4 pt-safe flex justify-between items-center z-20">
           <button onClick={onClose} className="text-white drop-shadow-md"><X size={28} /></button>
           <button onClick={() => setShowMusicPicker(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-black/40 backdrop-blur-md text-white border border-white/10">
              <Music size={14} />
              <span className="max-w-[120px] truncate">{selectedTrack?.title || "Add sound"}</span>
           </button>
           <div className="w-6"></div>
        </div>

        <div className="absolute right-4 top-24 flex flex-col gap-6 text-white items-center z-20">
            <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="flex flex-col items-center gap-1"><RotateCcw size={26} /><span className="text-[10px] font-black uppercase">Flip</span></button>
            <button onClick={() => setShowSpeedControls(!showSpeedControls)} className="flex flex-col items-center gap-1"><Zap size={26} className={recordingSpeed !== 1 ? 'text-brand-gold' : 'text-white'} /><span className="text-[10px] font-black uppercase">Speed</span></button>
            <button onClick={() => setShowFilters(!showFilters)} className="flex flex-col items-center gap-1"><Wand2 size={26} /><span className="text-[10px] font-black uppercase">Filters</span></button>
            <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-1">{isMuted ? <MicOff size={26} className="text-red-500" /> : <Mic size={26} />}<span className="text-[10px] font-black uppercase">{isMuted ? 'Muted' : 'Mic'}</span></button>
        </div>

        {showSpeedControls && (
            <div className="absolute bottom-32 left-0 w-full flex justify-center z-30 animate-fade-in">
                <div className="bg-black/60 backdrop-blur-xl rounded-full p-1.5 flex gap-1 border border-white/10">
                    {SPEEDS.map(s => (
                        <button key={s.val} onClick={() => setRecordingSpeed(s.val)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${recordingSpeed === s.val ? 'bg-brand-pink text-white' : 'text-gray-400'}`}>{s.label}</button>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="h-40 bg-brand-indigo flex flex-col items-center justify-center pb-safe px-8">
          <div className="flex gap-8 text-[11px] font-black text-gray-500 mb-8 overflow-x-auto w-full justify-center no-scrollbar">
             {MODES.map(mode => (
                 <button key={mode} onClick={() => setActiveMode(mode)} className={`transition-all whitespace-nowrap uppercase tracking-widest ${activeMode === mode ? 'text-white border-b-2 border-brand-pink pb-1' : 'text-gray-500'}`}>{mode}</button>
             ))}
          </div>

          <div className="flex items-center justify-between w-full">
             <div className="w-12 h-12 flex items-center justify-center">
                 {clips.length > 0 && !isRecording ? (
                     <button onClick={() => { setClips(prev => prev.slice(0, -1)); setTotalRecordedTime(p => Math.max(0, p - 3000)); }} className="w-full h-full flex items-center justify-center bg-white/5 rounded-full border border-white/10">
                         <Delete size={20} className="text-white" />
                     </button>
                 ) : (
                    <button className="flex flex-col items-center gap-1 opacity-60">
                        <Sparkles size={24} className="text-brand-gold" />
                        <span className="text-[8px] font-black uppercase text-white">Effects</span>
                    </button>
                 )}
             </div>
             
             <button 
               onMouseDown={startRecording}
               onMouseUp={stopRecording}
               className={`relative w-20 h-20 rounded-full border-[6px] transition-all duration-300 flex items-center justify-center ${isRecording ? 'border-brand-pink/30 scale-125' : 'border-white'}`}
             >
                <div className={`${activeMode === 'Photo' ? 'bg-white' : 'bg-brand-pink'} rounded-full transition-all duration-300 ${isRecording ? 'w-8 h-8 rounded-sm' : 'w-16 h-16'}`}></div>
             </button>

             <div className="w-12 h-12 flex items-center justify-center">
                {clips.length > 0 && !isRecording ? (
                    <button onClick={() => onCapture(clips[0].url, clips)} className="w-full h-full flex items-center justify-center bg-brand-pink rounded-full shadow-xl shadow-brand-pink/20 animate-pulse-slow">
                        <Check size={24} className="text-white" strokeWidth={4} />
                    </button>
                ) : (
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
                    >
                        <div className="w-10 h-10 rounded bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                            <ImageIcon size={22} className="text-white" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-white mt-1">Upload</span>
                    </button>
                )}
             </div>
          </div>
      </div>
      {showMusicPicker && <MusicPicker onSelect={(track) => { onSelectTrack(track); setShowMusicPicker(false); }} onClose={() => setShowMusicPicker(false)} />}
    </div>
  );
};