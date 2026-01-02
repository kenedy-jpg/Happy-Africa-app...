
import React, { useState, useRef } from 'react';
import { Clip } from '../types';
import { ChevronLeft, Play, Pause, Trash2, Check } from 'lucide-react';

interface TimelineEditorProps {
  clips: Clip[];
  onSave: (updatedClips: Clip[]) => void;
  onCancel: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ clips: initialClips, onSave, onCancel }) => {
  const [clips, setClips] = useState<Clip[]>(initialClips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewTime, setPreviewTime] = useState(0);

  const selectedClip = clips.find(c => c.id === selectedClipId);

  const handleUpdateTrim = (start: number, end: number) => {
      if (!selectedClipId) return;
      setClips(prev => prev.map(c => 
          c.id === selectedClipId ? { ...c, startTime: start, endTime: end } : c
      ));
  };

  const handleDeleteClip = () => {
      if (!selectedClipId) return;
      setClips(prev => prev.filter(c => c.id !== selectedClipId));
      setSelectedClipId(null);
  };

  const togglePlay = () => {
      if (videoRef.current) {
          if (isPlaying) videoRef.current.pause();
          else videoRef.current.play();
          setIsPlaying(!isPlaying);
      }
  };

  return (
    <div className="absolute inset-0 bg-black z-[70] flex flex-col animate-slide-up">
        {/* Preview Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center" onClick={togglePlay}>
            {selectedClip ? (
                <video 
                    ref={videoRef}
                    src={selectedClip.url + `#t=${selectedClip.startTime/1000},${selectedClip.endTime/1000}`}
                    className="w-full h-full object-contain"
                    onEnded={() => setIsPlaying(false)}
                />
            ) : (
                <div className="text-gray-500 text-sm">Select a clip to edit</div>
            )}
            {!isPlaying && selectedClip && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play size={48} className="text-white fill-white" />
                </div>
            )}
        </div>

        {/* Timeline Controls */}
        <div className="h-64 bg-gray-900 border-t border-white/10 flex flex-col">
            <div className="flex justify-between items-center p-2 px-4 border-b border-white/5">
                <button onClick={onCancel} className="text-white text-sm">Cancel</button>
                <span className="font-bold text-white text-sm">Adjust Clips</span>
                <button onClick={() => onSave(clips)} className="text-brand-pink font-bold text-sm">Save</button>
            </div>

            {/* Clips Strip */}
            <div className="flex gap-2 overflow-x-auto p-4 h-24 items-center no-scrollbar">
                {clips.map((clip, idx) => (
                    <div 
                        key={clip.id}
                        onClick={() => setSelectedClipId(clip.id)}
                        className={`relative h-16 min-w-[60px] bg-gray-700 rounded-md overflow-hidden border-2 cursor-pointer transition-all ${selectedClipId === clip.id ? 'border-brand-pink scale-105' : 'border-transparent'}`}
                    >
                        <video src={clip.url} className="w-full h-full object-cover opacity-50" />
                        <span className="absolute bottom-1 left-1 text-[8px] text-white font-bold">{((clip.endTime - clip.startTime)/1000).toFixed(1)}s</span>
                        <div className="absolute top-1 left-1 bg-black/50 text-white text-[8px] px-1 rounded">{idx + 1}</div>
                    </div>
                ))}
            </div>

            {/* Trimmer for Selected Clip */}
            {selectedClip && (
                <div className="px-6 py-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Start: {(selectedClip.startTime/1000).toFixed(1)}s</span>
                        <span>End: {(selectedClip.endTime/1000).toFixed(1)}s</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <input 
                            type="range" 
                            min={0} 
                            max={selectedClip.duration} 
                            value={selectedClip.startTime}
                            onChange={(e) => handleUpdateTrim(Number(e.target.value), Math.max(Number(e.target.value) + 500, selectedClip.endTime))}
                            className="flex-1 accent-brand-pink"
                        />
                        <input 
                            type="range" 
                            min={0} 
                            max={selectedClip.duration} 
                            value={selectedClip.endTime}
                            onChange={(e) => handleUpdateTrim(Math.min(selectedClip.startTime, Number(e.target.value) - 500), Number(e.target.value))}
                            className="flex-1 accent-brand-pink"
                        />
                    </div>
                    <div className="flex justify-center mt-2">
                        <button onClick={handleDeleteClip} className="flex items-center gap-2 text-red-500 text-xs font-bold px-4 py-2 bg-red-500/10 rounded-full">
                            <Trash2 size={14} /> Delete Clip
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
