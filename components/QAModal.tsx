
import React, { useState } from 'react';
import { X, MessageCircleQuestion, Send, ChevronRight } from 'lucide-react';
import { Question, User } from '../types';

interface QAModalProps {
  currentUser: User;
  onClose: () => void;
  onAsk: (questionText: string) => void;
}

const MOCK_QUESTIONS: Question[] = [
    { id: 'q1', text: 'What is your favorite food?', askedBy: 'user123', askedAt: '2h ago' },
    { id: 'q2', text: 'When is the next live stream?', askedBy: 'fan_page', askedAt: '5h ago' },
    { id: 'q3', text: 'Can you do a dance tutorial?', askedBy: 'dancer_01', askedAt: '1d ago' }
];

export const QAModal: React.FC<QAModalProps> = ({ currentUser, onClose, onAsk }) => {
  const [questionText, setQuestionText] = useState('');
  const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);

  const handleSend = () => {
      if (!questionText.trim()) return;
      onAsk(questionText);
      const newQ: Question = {
          id: Date.now().toString(),
          text: questionText,
          askedBy: currentUser.username,
          askedAt: 'Just now'
      };
      setQuestions(prev => [newQ, ...prev]);
      setQuestionText('');
  };

  return (
    <div className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
        <div className="bg-brand-dark w-full sm:w-[90%] max-w-md h-[80%] sm:h-auto sm:rounded-xl rounded-t-xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-indigo">
                <div className="w-6"></div>
                <h3 className="font-bold text-white flex items-center gap-2">
                    <MessageCircleQuestion className="text-brand-pink" size={20} /> Q&A
                </h3>
                <button onClick={onClose}><X size={20} className="text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                    <h4 className="text-white font-bold mb-1">Ask a question</h4>
                    <p className="text-xs text-gray-400 mb-4">Questions will appear on the profile.</p>
                    
                    <div className="relative">
                        <textarea 
                            className="w-full bg-black/30 rounded-lg p-3 text-sm text-white outline-none resize-none h-24 border border-white/10 focus:border-brand-pink/50 transition-colors placeholder-gray-500"
                            placeholder="Type something..."
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            maxLength={200}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!questionText.trim()}
                            className="absolute bottom-2 right-2 p-2 bg-brand-pink rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>

                <h4 className="text-white font-bold text-sm mt-2">Questions for you</h4>
                
                {questions.map(q => (
                    <div key={q.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-400">@{q.askedBy}</span>
                                <span className="text-[10px] text-gray-600">{q.askedAt}</span>
                            </div>
                            <p className="text-white text-sm font-medium">{q.text}</p>
                        </div>
                        <button className="bg-brand-pink/10 text-brand-pink px-3 py-1.5 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            Reply <ChevronRight size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
