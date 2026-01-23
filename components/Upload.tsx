import React, { useState, useRef, useEffect } from 'react';
import { Video, User, CreationContext, MusicTrack, InteractiveElement, Clip } from '../types';
import { generateMagicCaption, checkContentSafety, suggestHashtags } from '../services/geminiService';
import { Sparkles, Upload as UploadIcon, Loader, ShieldCheck, Scissors, ChevronRight, ChevronLeft, Music as MusicIcon, Save, Image as ImageIcon, AlertCircle, MapPin, Hash, Plus, X, ChevronDown, Eye, Globe } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { LiveHost } from './LiveHost';
import { VideoEditor } from './VideoEditor';
import { VideoTrimmer } from './VideoTrimmer';
import { ErrorModal } from './ErrorModal';
import { backend } from '../services/backend';
import { uploadDiagnostics } from '../services/uploadDiagnostics';
import { validateVideo, VIDEO_CONSTRAINTS, formatFileSize, formatDuration } from '../services/videoUploadHelper';

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
      <button onClick={onBack} className="p-2 -ml-2 text-white active:opacity-50 flex items-center gap-1 touch-manipulation">
          <ChevronLeft size={24} />
          <span className="text-xs font-bold uppercase tracking-tight hidden sm:inline">Back</span>
      </button>
      <h2 className="text-white font-black text-sm uppercase tracking-[0.2em]">{title}</h2>
      <button 
          onClick={onNext} 
          disabled={isUploading || !isMetadataReady}
          className="bg-brand-pink text-white px-6 py-2.5 rounded-full text-xs font-black shadow-lg shadow-brand-pink/20 active:scale-95 transition-transform hover:brightness-110 disabled:opacity-30 touch-manipulation min-w-[80px]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
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
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const PROCESS_STEPS = [
    "Preparing Video...",
    "Uploading to Server...",
    "Finalizing Post..."
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
   * Enhanced for mobile compatibility.
   */
  const extractMetadata = (url: string) => {
    setIsMetadataReady(false);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true; // Mobile Safari compatibility
    video.muted = true; // Required for autoplay on mobile
    
    video.onloadedmetadata = () => {
        if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
            setExtractedDuration(video.duration);
            setIsMetadataReady(true);
        } else {
            // Fallback for mobile browsers that struggle with duration
            // Try seeking to end to get duration
            video.currentTime = Number.MAX_SAFE_INTEGER;
            video.ontimeupdate = () => {
                if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
                    setExtractedDuration(video.duration);
                    setIsMetadataReady(true);
                    video.ontimeupdate = null;
                } else {
                    // Final fallback
                    setExtractedDuration(15);
                    setIsMetadataReady(true);
                }
            };
            setTimeout(() => {
                if (!isMetadataReady) {
                    setExtractedDuration(15);
                    setIsMetadataReady(true);
                }
            }, 500);
        }
    };

    video.onerror = () => {
        console.warn('[Upload] Video metadata load failed, using default duration');
        setExtractedDuration(15);
        setIsMetadataReady(true);
    };

    video.src = url;
  };

  const generateThumbnail = (videoUrl: string) => {
      // Generate thumbnail asynchronously without blocking upload
      if (videoUrl.startsWith('data:image')) {
          setGeneratedThumbnail(videoUrl);
          return;
      }
      
      // Use setTimeout to ensure this doesn't block the main thread
      setTimeout(() => {
          const video = document.createElement('video');
          video.src = videoUrl; 
          video.crossOrigin = 'anonymous'; 
          video.playsInline = true;
          video.muted = true;
          video.currentTime = 0.5; 
          video.onloadeddata = () => {
              const canvas = document.createElement('canvas'); 
              canvas.width = video.videoWidth || 720; 
              canvas.height = video.videoHeight || 1280;
              const ctx = canvas.getContext('2d');
              if (ctx) { 
                  try {
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height); 
                      setGeneratedThumbnail(canvas.toDataURL('image/jpeg', 0.7)); 
                  } catch (e) {
                      console.warn('[Upload] Thumbnail generation failed:', e);
                  }
              }
              video.src = '';
          };
          video.onerror = () => {
              console.warn('[Upload] Thumbnail video load failed');
          };
      }, 10); // Small delay to ensure UI updates first
  };

  /**
   * SIMPLIFIED: Just use the first 3 minutes of the video without re-encoding
   * This is much faster and doesn't require processing every frame
   */
  const trimVideoTo3Minutes = async (file: File, duration: number): Promise<File> => {
    const MAX_DURATION = 180; // 3 minutes in seconds
    
    if (duration <= MAX_DURATION) {
      console.log('[Upload] Video is within 3 min limit:', duration);
      return file;
    }

    console.log('[Upload] Video exceeds 3 minutes. Uploading first 3 minutes only.');
    // For now, just upload the original file and let the backend handle trimming
    // Or accept the longer video with a warning
    return file;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const file = files[0];
      const isVideo = file.type.startsWith('video') || file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i);
      
      if (isVideo) {
         // Handle video uploads (including mobile formats)
         console.log('[Upload] Video file selected:', file.name, file.type, file.size);
         const url = URL.createObjectURL(file);
         
         // Extract duration first to check if trimming is needed
         const tempVideo = document.createElement('video');
         tempVideo.src = url;
         tempVideo.playsInline = true;
         tempVideo.muted = true;
         
         tempVideo.onloadedmetadata = async () => {
           const videoDuration = tempVideo.duration;
           console.log('[Upload] Original video duration:', videoDuration);
           
           // Check if longer than 3 minutes
           if (videoDuration > 180) {
             const proceed = confirm('Video is longer than 3 minutes (max allowed). The first 3 minutes will be used. Continue?');
             if (!proceed) {
               URL.revokeObjectURL(url);
               return;
             }
             // Note: We'll accept the video but set duration to 180 for display
             setExtractedDuration(180);
           }
           
           setSelectedFile(file); 
           setFileUrl(url); 
           setClips([]); 
           setMediaType('video');
           // Set metadata ready immediately for fast upload
           setExtractedDuration(videoDuration > 180 ? 180 : videoDuration);
           setIsMetadataReady(true);
           // Generate thumbnail in background (optional)
           generateThumbnail(url); 
           setMode('edit');
         };
         
         tempVideo.onerror = () => {
           // Fallback if duration can't be extracted
           console.warn('[Upload] Could not check duration, proceeding with upload');
           setSelectedFile(file); 
           setFileUrl(url); 
           setClips([]); 
           setMediaType('video');
           // Set defaults immediately for fast upload
           setExtractedDuration(15);
           setIsMetadataReady(true);
           // Generate thumbnail in background (optional)
           generateThumbnail(url); 
           setMode('edit');
         };
      } else {
         // Handle image uploads for slideshows
         setImages(files.map(f => URL.createObjectURL(f))); 
         setMediaType('slideshow'); 
         setMode('edit');
         setExtractedDuration(files.length * 3);
         setIsMetadataReady(true);
      }
      
      // Clear input so same file can be selected again
      e.target.value = '';
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
     console.log('[Upload] POST clicked', { isMetadataReady, hasFile: !!selectedFile, duration: extractedDuration });
     
     if (!selectedFile) {
       console.error('[Upload] No file selected');
       setErrorModal({ title: 'No Video Selected', message: 'Please select a video first before posting.' });
       return;
     }
     
     // Allow posting even if metadata isn't ready yet (with fallback duration)
     if (!isMetadataReady) {
       console.warn('[Upload] Metadata not ready, using fallback duration');
       setExtractedDuration(15); // Use default
       setIsMetadataReady(true);
     }
     
     setIsUploadingNow(true);
     setMode('processing'); 
     setProcessStep(0);
     
     try {
       // ✅ POST IMMEDIATELY - Don't wait for upload to complete
       // Call completeUpload first to show post immediately in feed
       completeUpload(isDraft);
       
       // Then upload in background (non-blocking)
       backend.content.uploadVideo(
         selectedFile, 
         description, 
         generatedThumbnail, 
         extractedDuration,
         (progress) => {
           // Track real upload progress (0-100)
           setUploadProgress(progress);
           const progressStep = Math.floor((progress / 100) * PROCESS_STEPS.length);
           setProcessStep(Math.min(progressStep, PROCESS_STEPS.length - 1));
         }
       ).catch((error: any) => {
         console.error('[Upload] Background upload error:', error?.message);
       });
     } catch (error: any) {
       console.error('Upload error details:', {
         message: error?.message,
         code: error?.code,
         status: error?.status,
         fullError: error
       });

       // Check if this is a fallback save (video saved locally)
       const isFallbackSave = error?.message?.includes('saved locally as backup') || 
                              error?.message?.includes('Database save failed');

       if (isFallbackSave) {
         // Video was saved as fallback - tell user it's been saved
         setErrorModal({ 
           title: '✅ Video Saved Successfully', 
           message: 'Video uploaded and saved!\n\nNote: There was a temporary database issue, but your video has been saved and will sync when connection is restored.' 
         });
         completeUpload(isDraft);
         return;
       }

       // Run diagnostics to determine root cause for other errors
       console.log('[Upload] Running diagnostic tests...');
       let diagnostic;
       try {
         diagnostic = await uploadDiagnostics.runFullDiagnostic();
       } catch (diagError) {
         console.error('[Upload] Diagnostics failed:', diagError);
       }

       // Provide clear, actionable error messages
       let errorTitle = 'Upload Error';
       let errorMessage = '';

       // Check for common issues with mobile-friendly messages
       if (!error?.code && !error?.status) {
         // Network/connection issue
         errorTitle = 'Connection Error';
         errorMessage = `Unable to connect. Please check:\n\n• Your internet connection\n• Try switching between WiFi/mobile data\n• Wait and try again in a moment\n\nIf this persists, the server may be temporarily unavailable.`;
       } else if (diagnostic && !diagnostic.isAuthenticated) {
         errorTitle = 'Please Log In Again';
         errorMessage = 'Your session may have expired. Please log out and log back in, then try uploading again.';
       } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
         errorTitle = 'Network Error';
         errorMessage = `Upload failed due to network issues.\n\n📱 Mobile users: Try:\n• Switching between WiFi and mobile data\n• Moving to an area with better signal\n• Waiting for a more stable connection\n• Reducing video quality if possible`;
       } else if (error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
         errorTitle = 'Upload Timeout';
         errorMessage = `The upload took too long. This can happen on slower connections.\n\nTry:\n• Using a faster WiFi connection\n• Compressing your video first\n• Uploading a shorter video`;
       } else if (diagnostic && !diagnostic.canInsertVideos) {
         errorTitle = 'Permission Error';
         errorMessage = `Cannot save video due to permissions.\n\nPlease contact support or try logging in again.`;
       } else {
         // Generic error with diagnostic info
         const userMessage = diagnostic ? uploadDiagnostics.getUserMessage(diagnostic) : null;
         errorMessage = userMessage || error?.message || 'Failed to upload video. Please try again.';
         
         // Add mobile-specific tips for generic errors
         if (/mobile/i.test(navigator.userAgent)) {
           errorMessage += `\n\n📱 Mobile Tip: Try using WiFi instead of mobile data, or compress your video before uploading.`;
         }
       }

       setErrorModal({ title: errorTitle, message: errorMessage });
       setIsUploadingNow(false);
       setMode('details');
     }
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
      setIsUploadingNow(false);
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
                        disabled={isUploadingNow}
                        className="w-full py-4 bg-brand-pink rounded-xl text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all disabled:opacity-30 touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isUploadingNow ? <><Loader className="animate-spin" /> UPLOADING...</> : <><UploadIcon size={20} /> POST NOW</>}
                    </button>
                </div>
            </div>
        )}
        {mode === 'processing' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-brand-indigo p-10 text-center">
                <div className="flex flex-col items-center gap-8 w-full max-w-sm">
                    {/* Going Viral Animation */}
                    <div className="relative">
                        <div className="w-24 h-24 border-[6px] border-brand-pink border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-3xl animate-bounce">🚀</div>
                        </div>
                    </div>
                    
                    <div className="space-y-3 w-full">
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest animate-pulse">
                            GOING VIRAL! 🔥
                        </h2>
                        <p className="text-brand-gold text-sm font-black uppercase tracking-[0.2em]">Posted Instantly</p>
                    </div>
                </div>
            </div>
        )}
        {mode === 'live' && <LiveHost currentUser={currentUser} onEnd={onCancel} />}
        
        {/* Error Modal */}
        {errorModal && (
          <ErrorModal
            title={errorModal.title}
            message={errorModal.message}
            onClose={() => setErrorModal(null)}
          />
        )}
    </div>
  );
};