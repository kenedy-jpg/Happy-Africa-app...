import React, { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const REASONS = [
  'Nudity or sexual activity',
  'Hate speech or symbols',
  'Bullying or harassment',
  'False information',
  'Scam or fraud',
  'Violence or dangerous organizations',
  'Intellectual property violation',
  'Sale of illegal goods',
  'Suicide or self-injury'
];

export const ReportModal: React.FC<ReportModalProps> = ({ onClose, onSubmit }) => {
  const [step, setStep] = useState<'list' | 'confirm'>('list');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedReason) {
        setStep('confirm');
        setTimeout(() => {
            onSubmit(selectedReason);
        }, 1500);
    }
  };

  return (
    <div className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
        <div className="bg-brand-dark w-full sm:w-[90%] max-w-sm sm:rounded-xl rounded-t-xl overflow-hidden flex flex-col max-h-[80%] animate-slide-up">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-indigo">
                <div className="w-6"></div>
                <h3 className="font-bold text-white">Report</h3>
                <button onClick={onClose}><X size={20} className="text-white" /></button>
            </div>

            {step === 'list' ? (
                <div className="overflow-y-auto flex-1 p-2">
                    <p className="p-4 text-sm text-gray-400 font-medium">
                        Why are you reporting this video?
                    </p>
                    {REASONS.map((reason) => (
                        <button 
                            key={reason}
                            onClick={() => setSelectedReason(reason)}
                            className="w-full flex justify-between items-center p-4 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 text-left"
                        >
                            <span className="text-white text-sm">{reason}</span>
                            {selectedReason === reason ? (
                                <div className="w-5 h-5 bg-brand-pink rounded-full flex items-center justify-center">
                                    <Check size={12} className="text-white" />
                                </div>
                            ) : (
                                <ChevronRight size={16} className="text-gray-600" />
                            )}
                        </button>
                    ))}
                    <div className="p-4 pt-6">
                        <button 
                            disabled={!selectedReason}
                            onClick={handleSubmit}
                            className="w-full bg-brand-pink text-white font-bold py-3 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                        <Check size={32} className="text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Thanks for reporting</h4>
                    <p className="text-sm text-gray-400">
                        We'll review this video to ensure it complies with our Community Guidelines.
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};