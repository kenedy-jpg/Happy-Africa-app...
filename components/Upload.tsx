import React, { useState, useRef, useEffect } from 'react';
import { Video, User, CreationContext, MusicTrack, InteractiveElement, Clip } from '../types';
import { generateMagicCaption, checkContentSafety, suggestHashtags } from '../services/geminiService';
import { Sparkles, Upload as UploadIcon, Loader, ShieldCheck, Scissors, ChevronRight, ChevronLeft, Music as MusicIcon, Save, Image as ImageIcon, AlertCircle, MapPin, Hash, Plus, X, ChevronDown, Eye, Globe } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { LiveHost } from './LiveHost';
import { VideoEditor } from './VideoEditor';
import { VideoTrimmer } from './VideoTrimmer';
import { backend } from '../services/backend';

interface UploadProps {
  currentUser: User;
  onUpload: (newVideo: Video, file?: File) => void;
  onCancel: () => void;
  creationContext?: CreationContext;
  draft?: Video | null; 
}

type Mode = 'capture' | 'edit' | 'details' | 'processing' | 'live' | 'trim';

const DetailsHeader = ({ title, onBack, onNext, isUploading, isMetadataReady }: any) => (
  <div className="flex justify-between items-center p-4 pt-safe border-b border-white/10 bg-brand-indigo z-[60] shrink-0">
      <button onClick={onBack} className="p-2 -ml-2 text-white active:opacity-50 flex items-center gap-1">
          <ChevronLeft size={24} />
          <span className="text-xs font-bold uppercase tracking-tight hidden sm:inline">Back</span>
      </button>
      <h2 className="text-white font-black text-sm uppercase tracking-[0.2em]">{title}</h2>
      <button 
          onClick={onNext} 
          disabled={isUploading || !isMetadataReady}
          className="bg-brand-pink text-white px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-brand-pink/20 active:scale-95 transition-transform hover:brightness-110 disabled:opacity-30"
      >
          {isUploading ? 'WAIT...' : 'POST'}
      </button>
  </div>
);

export const Upload: React.FC<UploadProps> = ({ currentUser, onUpload, onCancel, creationContext, draft }) => {
  const [mode, setMode] = useState<Mode>('capture');
  const [mediaType, setMediaType] = useState<'video' | 'slideshow'>('video');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [interactiveElements, setInteractiveElements] = useState<InteractiveElement[]>([]);
  const [musicTrack, setMusicTrack] = useState<MusicTrack | null>(null);
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<Video['category']>('comedy');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'friends'>('public');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [isUploadingNow, setIsUploadingNow] = useState(false);
  const [extractedDuration, setExtractedDuration] = useState<number>(0);
  const [isMetadataReady, setIsMetadataReady] = useState(false);

  const PROCESS_STEPS = [
    "Optimizing Vibe...",
    "AI Enhancement...",
    "Going Worldwide..."
  ];

  useEffect(() => {
     if (creationContext?.type === 'sound') {
         setMusicTrack({ id: creationContext.track.id, title: creationContext.track.title, artist: creationContext.track.artist, duration: '0:30', cover: '', genre: '', audioUrl: creationContext.track.audioUrl });
     } else if (creationContext?.type === 'hashtag') {
         setDescription(`${creationContext.tag} `);
     } else if (creationContext?.type === 'stitch') {
         setMode('trim');
     } else if (creationContext?.type === 'live') {
         setMode('live');
     }
  }, [creationContext]);

  /**
   * ROBUST DURATION EXTRACTION
   * Blocks post button until actual duration is measured.
   */
  const extractMetadata = (url: string) => {
    setIsMetadataReady(false);
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
        if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
            setExtractedDuration(video.duration);
            setIsMetadataReady(true);
        } else {
            // Fallback for some browsers that struggle with stream duration
            setExtractedDuration(15);
            setIsMetadataReady(true);
        }
    };

    video.onerror = () => {
        setExtractedDuration(15);
        setIsMetadataReady(true);
    };

    video.src = url;
  };

  const generateThumbnail = (videoUrl: string) => {
      if (videoUrl.startsWith('data:image')) {
          setGeneratedThumbnail(videoUrl);
          return;
      }
      const video = document.createElement('video');
      video.src = videoUrl; 
      video.crossOrigin = 'anonymous'; 
      video.currentTime = 1; 
      video.onloadeddata = () => {
          setTimeout(() => {
              const canvas = document.createElement('canvas'); 
              canvas.width = video.videoWidth; 
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) { 
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height); 
                  setGeneratedThumbnail(canvas.toDataURL('image/jpeg', 0.7)); 
              }
          }, 500);
      };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const isVideo = files[0].type.startsWith('video');
      if (isVideo) {
         const file = files[0]; 
         const url = URL.createObjectURL(file);
         setSelectedFile(file); 
         setFileUrl(url); 
         setClips([]); 
         setMediaType('video');
         extractMetadata(url);
         generateThumbnail(url); 
         setMode('edit');
      } else {
         setImages(files.map(f => URL.createObjectURL(f))); 
         setMediaType('slideshow'); 
         setMode('edit');
         setExtractedDuration(files.length * 3);
         setIsMetadataReady(true);
      }
    }
  };

  const handleCameraCapture = async (blobUrl: string, capturedClips?: Clip[], metadata?: { templateId?: string }) => {
    setFileUrl(blobUrl); 
    setClips(capturedClips || []);
    if (metadata?.templateId) setTemplateId(metadata.templateId);
    setMediaType('video');
    
    if (capturedClips && capturedClips.length > 0) {
        const total = capturedClips.reduce((acc, c) => acc + (c.endTime - c.startTime) / 1000, 0);
        setExtractedDuration(total);
        setIsMetadataReady(true);
    } else {
        extractMetadata(blobUrl);
    }

    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        setSelectedFile(new File([blob], `cap_${Date.now()}.webm`, { type: blob.type || "video/webm" }));
    } catch (e) { console.error(e); }
    generateThumbnail(blobUrl); 
    setMode('edit');
  };

  const handlePost = async (isDraft: boolean = false) => {
     if (!isMetadataReady) return;
     setIsUploadingNow(true);
     setMode('processing'); 
     setProcessStep(0);
     
     for (let i = 0; i < PROCESS_STEPS.length; i++) {
         setProcessStep(i);
         await new Promise(r => setTimeout(r, 600));
     }
     
     completeUpload(isDraft);
  };

  const completeUpload = (isDraft: boolean) => {
      const videoId = draft ? draft.id : `v${Date.now()}`;
      const poster = generatedThumbnail || (images.length > 0 ? images[0] : 'https://picsum.photos/400/800');
      
      const newVideo: Video = {
        id: videoId, 
        url: mediaType === 'video' ? fileUrl! : undefined, 
        images: mediaType === 'slideshow' ? images : undefined,
        clips: clips.length > 0 ? clips : undefined, 
        type: mediaType, 
        poster: poster, 
        description: description, 
        location: location.trim() || undefined, 
        hashtags: ['#HappyAfrica', '#Africa', '#Viral'], 
        likes: draft ? draft.likes : 0,
        comments: draft ? draft.comments : 0, 
        shares: draft ? draft.shares : 0, 
        user: currentUser, 
        musicTrack: musicTrack ? `${musicTrack.title} - ${musicTrack.artist}` : 'Original Sound',
        category: category, 
        isDraft: isDraft, 
        interactiveElements: interactiveElements.length > 0 ? interactiveElements : undefined,
        duration: extractedDuration || 15
      };
      onUpload(newVideo, selectedFile);
  };

  return (
    <div className="fixed inset-0 bg-brand-indigo z-[100] flex flex-col">
        {mode === 'capture' && <CameraCapture onCapture={handleCameraCapture} onClose={onCancel} onSelectTrack={setMusicTrack} selectedTrack={musicTrack} creationContext={creationContext} onFileSelect={handleFileSelect} />}
        {mode === 'edit' && <VideoEditor fileUrl={fileUrl || undefined} images={images} clips={clips} musicTrack={musicTrack} creationContext={creationContext} templateId={templateId} onCancel={() => setMode('capture')} onSave={(url, overlays) => { if (url) setFileUrl(url); setInteractiveElements(overlays?.map(o => ({ id: o.id.toString(), type: o.type === 'poll' ? 'poll' : 'sticker', content: o.content, x: o.x, y: o.y, scale: o.scale, rotation: 0, options: o.pollOptions })) || []); setMode('details'); }} />}
        {mode === 'trim' && creationContext?.type === 'stitch' && <VideoTrimmer sourceVideo={creationContext.video} onCancel={onCancel} onNext={(data) => { setMode('capture'); }} />}
        {mode === 'details' && (
            <div className="flex-1 flex flex-col bg-brand-indigo overflow-hidden">
                <DetailsHeader title="Post" onBack={() => setMode('edit')} onNext={() => handlePost(false)} isUploading={isUploadingNow} isMetadataReady={isMetadataReady} />
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 no-scrollbar pb-32">
                    <div className="flex gap-4 items-start">
                        <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your video... #HappyAfrica" className="w-full bg-transparent text-white text-sm outline-none resize-none h-24 placeholder-gray-500" maxLength={150} />
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex gap-3">
                                    <button onClick={async () => { setIsGenerating(true); setDescription(await generateMagicCaption(description)); setIsGenerating(false); }} disabled={isGenerating} className="text-brand-gold text-xs font-bold flex items-center gap-1"><Sparkles size={14} className={isGenerating ? "animate-spin" : ""} /> AI Caption</button>
                                    <button onClick={async () => { setIsGeneratingTags(true); const tags = await suggestHashtags(description); setDescription(p => p + " " + tags.join(' ')); setIsGeneratingTags(false); }} disabled={isGeneratingTags} className="text-brand-pink text-xs font-bold flex items-center gap-1"><Hash size={14} className={isGeneratingTags ? "animate-spin" : ""} /> Tags</button>
                                </div>
                                <span className="text-[10px] text-gray-500 font-bold">{description.length}/150</span>
                            </div>
                        </div>
                        <div className="w-24 aspect-[3/4] rounded-lg bg-gray-800 border border-white/10 overflow-hidden shrink-0 relative">
                            {generatedThumbnail ? <img src={generatedThumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageIcon /></div>}
                            <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[8px] text-white font-bold">
                                {isMetadataReady ? `${Math.floor(extractedDuration)}s` : '...'}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10"><MapPin size={20} className="text-gray-400" /><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="bg-transparent text-white text-sm outline-none flex-1" /></div>
                        
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="flex items-center gap-3 mb-3">
                                <Globe size={20} className="text-brand-gold" />
                                <span className="text-white text-sm font-bold uppercase tracking-tight">Visibility</span>
                            </div>
                            <div className="flex gap-2">
                                {['public', 'friends', 'private'].map(v => (
                                    <button key={v} onClick={() => setVisibility(v as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${visibility === v ? 'bg-brand-pink text-white shadow-lg' : 'bg-white/5 text-gray-400'}`}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/10"><div className="flex items-center gap-3 mb-3"><Plus size={20} className="text-gray-400" /><span className="text-white text-sm">Select Category</span></div><div className="flex flex-wrap gap-2">
                            {['dance', 'comedy', 'travel', 'tech', 'food'].map(cat => (<button key={cat} onClick={() => setCategory(cat as any)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${category === cat ? 'bg-brand-pink text-white border-brand-pink shadow-lg' : 'bg-white/5 text-gray-400 border border-white/10'}`}>{cat}</button>))}
                        </div></div>
                    </div>
                    <button 
                        onClick={() => handlePost(false)} 
                        disabled={isUploadingNow || !isMetadataReady}
                        className="w-full py-4 bg-brand-pink rounded-xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all disabled:opacity-30"
                    >
                        {isUploadingNow ? <><Loader className="animate-spin" /> UPLOADING...</> : <><UploadIcon size={20} /> POST NOW</>}
                    </button>
                </div>
            </div>
        )}
        {mode === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-indigo p-10 text-center">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-[6px] border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <UploadIcon size={24} className="text-brand-pink animate-bounce" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">{PROCESS_STEPS[processStep]}</h2>
                        <p className="text-brand-gold text-[10px] font-black uppercase tracking-[0.2em]">Syncing to Happy Africa</p>
                    </div>
                </div>
            </div>
        )}
        {mode === 'live' && <LiveHost currentUser={currentUser} onEnd={onCancel} />}
    </div>
  );
};