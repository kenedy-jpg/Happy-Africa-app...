
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Hash, ChevronRight, Loader, User as UserIcon, Sparkles, Send, Bot, Music, ShoppingBag, Radio, ScanLine, Link, Mic } from 'lucide-react';
import { Video, PageRoute, User, MusicTrack, Product } from '../types';
import { backend } from '../services/backend';
import { formatNumber, MOCK_PRODUCTS } from '../constants';
import { askDiscoveryAssistant, AIResponse } from '../services/geminiService';

interface DiscoverProps {
  onVideoClick: (video: Video) => void;
  onNavigate: (route: PageRoute) => void;
  onScanQR: () => void; 
}

interface ChatMessage {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    sources?: Array<{ title: string; url: string }>;
}

type SearchTab = 'Top' | 'Users' | 'Videos' | 'Sounds' | 'Shop' | 'LIVE';

export const Discover: React.FC<DiscoverProps> = ({ onVideoClick, onNavigate, onScanQR }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('Top');
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  
  // Results State
  const [videoResults, setVideoResults] = useState<Video[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);
  const [soundResults, setSoundResults] = useState<MusicTrack[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // AI Assistant State
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTrending = async () => {
      setIsLoading(true);
      try {
        const videos = await backend.content.getTrendingVideos();
        setTrendingVideos(videos);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTrending();
  }, []);

  useEffect(() => {
      const delayDebounceFn = setTimeout(async () => {
          if (searchQuery.trim()) {
              setIsSearching(true);
              
              const p1 = backend.content.searchVideos(searchQuery);
              const p2 = backend.user.searchUsers(searchQuery);
              const p3 = backend.content.searchSounds(searchQuery);

              const [vid, usr, snd] = await Promise.all([p1, p2, p3]);
              
              setVideoResults(vid);
              setUserResults(usr);
              setSoundResults(snd);
              
              setIsSearching(false);
          } else {
              setVideoResults([]);
              setUserResults([]);
              setSoundResults([]);
          }
      }, 600);

      return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
      if (showAIAssistant) {
          setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      }
  }, [chatMessages, isAiThinking, showAIAssistant]);

  const handleAskAI = async () => {
      if (!aiInput.trim()) return;
      const userMsg = aiInput;
      setAiInput('');
      setChatMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg }]);
      setIsAiThinking(true);

      const response: AIResponse = await askDiscoveryAssistant(userMsg);
      
      setChatMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: 'ai', 
          text: response.text,
          sources: response.sources
      }]);
      setIsAiThinking(false);
  };

  const startVoiceSearch = () => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          // Fallback simulation
          setIsListening(true);
          setTimeout(() => {
              setSearchQuery("Afrobeats dance");
              setIsListening(false);
          }, 2000);
          return;
      }

      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);

      recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setSearchQuery(text);
          setIsListening(false);
      };

      recognition.onerror = () => {
          setIsListening(false);
      };

      recognition.onend = () => {
          setIsListening(false);
      };

      recognition.start();
  };

  const renderUsers = () => (
      <div className="flex flex-col gap-4">
          {userResults.map(user => (
              <div key={user.id} className="flex items-center justify-between" onClick={() => onNavigate({ name: 'user-profile', user })}>
                  <div className="flex items-center gap-3">
                      <img src={user.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                      <div>
                          <p className="font-bold text-white text-sm">{user.username}</p>
                          <p className="text-gray-400 text-xs">{user.displayName} • {formatNumber(user.followers)} Followers</p>
                      </div>
                  </div>
                  <button className="bg-brand-pink text-white text-xs font-bold px-4 py-1.5 rounded-sm">Follow</button>
              </div>
          ))}
          {userResults.length === 0 && !isSearching && <div className="text-center text-gray-500 py-10">No users found</div>}
      </div>
  );

  const renderSounds = () => (
      <div className="flex flex-col gap-4">
          {soundResults.map((sound, i) => (
              <div key={i} className="flex items-center justify-between" onClick={() => onNavigate({ name: 'sound', id: sound.id, title: sound.title, artist: sound.artist, cover: sound.cover })}>
                  <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center relative overflow-hidden">
                          <img src={sound.cover} className="w-full h-full object-cover opacity-70" />
                          <Play size={16} className="absolute text-white fill-white" />
                      </div>
                      <div>
                          <p className="font-bold text-white text-sm">{sound.title}</p>
                          <p className="text-gray-400 text-xs">{sound.artist} • {sound.duration}</p>
                      </div>
                  </div>
                  <button className="border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-sm">Use Sound</button>
              </div>
          ))}
          {soundResults.length === 0 && !isSearching && <div className="text-center text-gray-500 py-10">No sounds found</div>}
      </div>
  );

  const renderVideos = () => (
      <div className="grid grid-cols-2 gap-2">
          {videoResults.map((video) => (
              <div 
                key={video.id} 
                className="aspect-[3/4] bg-brand-dark rounded-lg overflow-hidden relative cursor-pointer group"
                onClick={() => onVideoClick(video)}
              >
                  <img src={video.poster} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                      <Play size={12} fill="white" /> {formatNumber(video.likes)}
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <img src={video.user.avatarUrl} className="w-5 h-5 rounded-full border border-white" />
                      <span className="text-[10px] text-white font-bold shadow-black drop-shadow-md truncate max-w-[60px]">{video.user.username}</span>
                  </div>
              </div>
          ))}
          {videoResults.length === 0 && !isSearching && <div className="col-span-2 text-center text-gray-500 py-10">No videos found</div>}
      </div>
  );

  const renderShop = () => (
      <div className="grid grid-cols-2 gap-2">
          {/* Mock Shop items matching search */}
          {MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(product => (
              <div key={product.id} className="bg-white rounded-lg p-2 cursor-pointer" onClick={() => onNavigate({ name: 'product-detail', product })}>
                  <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                      <img src={product.image} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-black text-xs font-bold line-clamp-2">{product.name}</p>
                  <p className="text-brand-pink font-bold text-sm">${product.price}</p>
              </div>
          ))}
          {MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-10">No products found</div>
          )}
      </div>
  );

  const renderLive = () => (
      <div className="grid grid-cols-2 gap-2">
          {/* Mock Lives */}
          {userResults.slice(0, 2).map((user, i) => (
              <div key={`live-${i}`} className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden relative cursor-pointer">
                  <div className="absolute top-2 left-2 bg-brand-pink text-white text-[9px] font-bold px-1.5 py-0.5 rounded">LIVE</div>
                  <img src={`https://picsum.photos/300/400?random=${i+50}`} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute bottom-2 left-2 text-white font-bold text-xs">{user.username}</div>
                  <div className="absolute bottom-2 right-2 text-white text-[10px] bg-black/50 px-1 rounded">{formatNumber(user.followers)} viewers</div>
              </div>
          ))}
          {userResults.length === 0 && <div className="col-span-2 text-center text-gray-500 py-10">No live streams found</div>}
      </div>
  );

  return (
    <div className="w-full h-full bg-brand-indigo flex flex-col pb-24 overflow-y-auto relative">
      {/* Search Header */}
      <div className="sticky top-0 z-20 bg-brand-indigo px-4 pt-safe pb-2">
        <div className="flex gap-3 items-center mb-3 mt-2">
            <button 
                onClick={onScanQR}
                className="text-white"
            >
                <ScanLine size={24} />
            </button>
            <div className="relative flex-1">
                <input
                    type="text"
                    placeholder="Search users, videos, sounds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/10 text-white text-sm rounded-lg pl-10 pr-10 py-2.5 outline-none focus:bg-white/20 transition-colors placeholder-gray-400 border border-transparent focus:border-brand-pink/50"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {searchQuery ? (
                        <button onClick={() => setSearchQuery('')}><X size={14} className="text-gray-400" /></button>
                    ) : (
                        <button onClick={startVoiceSearch} className={isListening ? "text-brand-pink animate-pulse" : "text-gray-400"}>
                            <Mic size={16} />
                        </button>
                    )}
                    {isSearching && <Loader size={14} className="text-gray-400 animate-spin" />}
                </div>
            </div>
            
            {/* AI Toggle Button */}
            <button 
                onClick={() => setShowAIAssistant(true)}
                className="bg-gradient-to-br from-brand-pink to-brand-gold text-black p-2.5 rounded-lg shadow-lg hover:brightness-110 transition-transform active:scale-95"
            >
                <Bot size={20} />
            </button>
        </div>

        {/* Search Tabs */}
        {searchQuery && (
            <div className="flex justify-between border-b border-white/10 text-sm font-medium text-gray-400">
                {['Top', 'Users', 'Videos', 'Sounds', 'Shop', 'LIVE'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as SearchTab)}
                        className={`pb-2 relative ${activeTab === tab ? 'text-white font-bold' : ''}`}
                    >
                        {tab}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-full"></div>}
                    </button>
                ))}
            </div>
        )}
      </div>

      {searchQuery ? (
          <div className="px-4 py-4 min-h-0 flex-1">
              {activeTab === 'Top' && (
                  <div className="flex flex-col gap-6">
                      {userResults.length > 0 && (
                          <div>
                              <h3 className="font-bold text-white mb-3">Users</h3>
                              <div className="bg-white/5 rounded-xl p-2">
                                  {userResults.slice(0, 1).map(user => (
                                      <div key={user.id} className="flex items-center justify-between p-2" onClick={() => onNavigate({ name: 'user-profile', user })}>
                                          <div className="flex items-center gap-3">
                                              <img src={user.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                                              <div>
                                                  <p className="font-bold text-white text-sm">{user.username}</p>
                                                  <p className="text-gray-400 text-xs">{formatNumber(user.followers)} Followers</p>
                                              </div>
                                          </div>
                                          <button className="bg-brand-pink text-white text-xs font-bold px-4 py-1.5 rounded-sm">Follow</button>
                                      </div>
                                  ))}
                                  {userResults.length > 1 && (
                                      <button onClick={() => setActiveTab('Users')} className="w-full py-2 text-xs font-bold text-brand-pink text-center">See more</button>
                                  )}
                              </div>
                          </div>
                      )}
                      <div>
                          <h3 className="font-bold text-white mb-3">Videos</h3>
                          {renderVideos()}
                      </div>
                  </div>
              )}

              {activeTab === 'Users' && renderUsers()}
              {activeTab === 'Videos' && renderVideos()}
              {activeTab === 'Sounds' && renderSounds()}
              {activeTab === 'Shop' && renderShop()}
              {activeTab === 'LIVE' && renderLive()}
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
              {isListening ? (
                  <div className="flex flex-col items-center gap-4 animate-pulse">
                      <div className="w-20 h-20 rounded-full bg-brand-pink/20 flex items-center justify-center">
                          <Mic size={40} className="text-brand-pink" />
                      </div>
                      <p className="text-lg font-bold text-white">Listening...</p>
                  </div>
              ) : (
                  <>
                    <Search size={48} className="mb-4 opacity-50" />
                    <p>Type or speak to search...</p>
                  </>
              )}
          </div>
      )}

      {/* AI Assistant Overlay (Same as before) */}
      {showAIAssistant && (
          <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in" onClick={() => setShowAIAssistant(false)}>
              <div 
                className="bg-brand-dark w-full h-[80%] rounded-t-2xl flex flex-col animate-slide-up shadow-2xl border-t border-brand-pink/20"
                onClick={e => e.stopPropagation()}
              >
                  {/* AI Header */}
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-indigo/90 rounded-t-2xl">
                      <div className="flex items-center gap-2">
                          <div className="bg-brand-pink p-1.5 rounded-full">
                              <Sparkles size={16} className="text-white" />
                          </div>
                          <h3 className="font-bold text-white">Happy Assistant</h3>
                      </div>
                      <button onClick={() => setShowAIAssistant(false)}><X size={20} className="text-gray-400" /></button>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      {chatMessages.length === 0 && (
                          <div className="text-center text-gray-500 text-sm mt-10">
                              <p>Ask me anything about trends, music, or African culture! 🌍</p>
                          </div>
                      )}
                      
                      {chatMessages.map(msg => (
                          <div key={msg.id} className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                              <div 
                                className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm ${
                                    msg.sender === 'user' 
                                    ? 'bg-brand-pink text-white rounded-br-none' 
                                    : 'bg-white/10 text-gray-100 rounded-bl-none'
                                }`}
                              >
                                  {msg.text}
                              </div>
                              
                              {/* Search Grounding Sources */}
                              {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-1 max-w-[85%]">
                                      {msg.sources.map((source, i) => (
                                          <a 
                                            key={i} 
                                            href={source.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="bg-black/40 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] text-brand-gold hover:bg-black/60 transition-colors"
                                          >
                                              <Link size={10} />
                                              <span className="truncate max-w-[100px]">{source.title}</span>
                                          </a>
                                      ))}
                                  </div>
                              )}
                          </div>
                      ))}
                      
                      {isAiThinking && (
                          <div className="flex items-center gap-2 text-gray-500 text-xs ml-2">
                              <Sparkles size={12} className="animate-spin text-brand-gold" /> Thinking...
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 border-t border-white/10 bg-brand-dark pb-safe">
                      <div className="bg-white/10 rounded-full flex items-center px-4 py-2">
                          <input 
                            className="bg-transparent flex-1 outline-none text-sm text-white placeholder-gray-500"
                            placeholder="Ask about trends..."
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                          />
                          <button 
                            onClick={handleAskAI}
                            disabled={!aiInput.trim() || isAiThinking}
                            className={`p-1.5 rounded-full ${aiInput.trim() ? 'bg-brand-pink text-white' : 'text-gray-500'}`}
                          >
                              <Send size={18} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
